"""FAO-56 daily reference ET and a transparent fixed-root-zone research water balance."""
import math
from datetime import date,timedelta

PHASES=('establishment','vegetative','reproductive','maturation')
CROPS={
    'soy':{'phase_days':(15,35,45,20),'kc_initial':.4,'kc_mid':1.15,'kc_end':.5,'p_base':.5,
           'cad_mm':{'AD2':32.,'AD4':55.,'AD6':95.}},
    'maize2':{'phase_days':(20,40,40,20),'kc_initial':.3,'kc_mid':1.2,'kc_end':.35,'p_base':.55,
              'cad_mm':{'AD2':31.8,'AD4':54.6,'AD6':95.4}}}


def finite(*values):
    if any(isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) for v in values):
        raise ValueError('All required numeric values must be finite; missing is not zero')


def saturation_vapor_pressure(temperature):
    finite(temperature)
    if not -90<temperature<70:raise ValueError('Temperature outside supported domain')
    return .6108*math.exp(17.27*temperature/(temperature+237.3))


def et0_daily(day,latitude,elevation,t_min,t_max,radiation,wind,pressure,*,dewpoint=None,ea_kpa=None):
    finite(latitude,elevation,t_min,t_max,radiation,wind,pressure)
    if not isinstance(day,date) or not -89<latitude<89 or not -500<=elevation<=9000 or t_min>t_max or radiation<0 or wind<0 or not 20<=pressure<=120:
        raise ValueError('Invalid ET0 inputs, units or supported geographic domain')
    if (dewpoint is None)==(ea_kpa is None):raise ValueError('Provide exactly one humidity source')
    ea=saturation_vapor_pressure(dewpoint) if dewpoint is not None else ea_kpa
    finite(ea)
    if ea<0:raise ValueError('Negative vapor pressure')
    t_mean=(t_min+t_max)/2
    es=(saturation_vapor_pressure(t_min)+saturation_vapor_pressure(t_max))/2
    slope=4098*saturation_vapor_pressure(t_mean)/(t_mean+237.3)**2
    gamma=.000665*pressure
    julian=day.timetuple().tm_yday;latitude=math.radians(latitude)
    dr=1+.033*math.cos(2*math.pi*julian/365)
    declination=.409*math.sin(2*math.pi*julian/365-1.39)
    sunset=math.acos(max(-1,min(1,-math.tan(latitude)*math.tan(declination))))
    ra=24*60/math.pi*.0820*dr*(sunset*math.sin(latitude)*math.sin(declination)+math.cos(latitude)*math.cos(declination)*math.sin(sunset))
    rso=(.75+.00002*elevation)*ra
    if rso<=0:raise ValueError('Polar night unsupported by this daily implementation')
    ratio=radiation/rso;used_ratio=min(1,max(.3,ratio))
    rnl=4.903e-9*((t_max+273.16)**4+(t_min+273.16)**4)/2*max(0,.34-.14*math.sqrt(ea))*(1.35*used_ratio-.35)
    rn=.77*radiation-rnl
    vpd_raw=es-ea;vpd=max(0,vpd_raw)
    raw=(.408*slope*rn+gamma*900/(t_mean+273)*wind*vpd)/(slope+gamma*(1+.34*wind))
    return {'et0_mm':max(0,raw),'et0_raw_mm':raw,'ra_mj_m2':ra,'rso_mj_m2':rso,'rn_mj_m2':rn,
            'ea_kpa':ea,'vpd_kpa':vpd,'rs_rso_raw':ratio,'radiation_ratio_clipped':ratio!=used_ratio,
            'vpd_clipped':vpd_raw<0,'et0_clipped':raw<0}


def bucket_day(storage,capacity,rain,etc,p,*,irrigation=0.,runoff_fraction=0.):
    finite(storage,capacity,rain,etc,p,irrigation,runoff_fraction)
    if capacity<=0 or not 0<=storage<=capacity or min(rain,etc,irrigation)<0 or not 0<p<1 or not 0<=runoff_fraction<=1:
        raise ValueError('Invalid bucket state, forcing or parameters')
    runoff=rain*runoff_fraction;infiltration=rain-runoff
    wet=storage+infiltration+irrigation;drainage=max(0,wet-capacity);wet=min(wet,capacity)
    ks=min(1,wet/(capacity*(1-p)))
    eta=min(wet,ks*etc);end=wet-eta
    return {'storage_start_mm':storage,'storage_end_mm':end,'capacity_mm':capacity,'raw_mm':p*capacity,
            'rain_mm':rain,'infiltration_mm':infiltration,'irrigation_mm':irrigation,'runoff_mm':runoff,
            'drainage_mm':drainage,'etc_mm':etc,'eta_mm':eta,'et_deficit_mm':etc-eta,'ks':ks,'p':p,
            'mass_residual_mm':storage+rain+irrigation-runoff-drainage-eta-end}


def crop_day(crop,index):
    if crop not in CROPS:raise ValueError('Unknown crop or day')
    return phase_kc(CROPS[crop],index)


def phase_kc(config,index):
    """Phase and Kc for day `index` of a cycle described by an explicit parameter set."""
    if not isinstance(index,int) or isinstance(index,bool):raise ValueError('Unknown crop or day')
    lengths=config['phase_days']
    if not 0<=index<sum(lengths):raise ValueError('Day outside crop cycle')
    cumulative=0
    for phase,length in zip(PHASES,lengths):
        if index<cumulative+length:
            offset=index-cumulative
            if phase=='establishment':kc=config['kc_initial']
            elif phase=='vegetative':kc=config['kc_initial']+(config['kc_mid']-config['kc_initial'])*(offset+1)/length
            elif phase=='reproductive':kc=config['kc_mid']
            else:kc=config['kc_mid']+(config['kc_end']-config['kc_mid'])*(offset+1)/length
            return phase,kc
        cumulative+=length


def simulate(weather,crop,capacity,initial_fraction,*,dry_phase=None,rain_multiplier=1.,runoff_fraction=0.):
    if crop not in CROPS or dry_phase not in (None,*PHASES):raise ValueError('Unsupported crop or phase')
    finite(initial_fraction,rain_multiplier)
    if not 0<=initial_fraction<=1 or not 0<=rain_multiplier<=1:raise ValueError('Fractions outside 0-1')
    if len(weather)!=sum(CROPS[crop]['phase_days']):raise ValueError('Full crop cycle required')
    storage=capacity*initial_fraction;rows=[];previous=None
    for index,forcing in enumerate(weather):
        day=date.fromisoformat(forcing['day_utc'])
        if previous is not None and day!=previous+timedelta(days=1):raise ValueError('Noncontiguous weather')
        previous=day;phase,kc=crop_day(crop,index)
        finite(forcing['rain_mm'],forcing['et0_mm'])
        if min(forcing['rain_mm'],forcing['et0_mm'])<0:raise ValueError('Negative forcing')
        rain=forcing['rain_mm']*(rain_multiplier if phase==dry_phase else 1)
        etc=kc*forcing['et0_mm'];p=min(.8,max(.1,CROPS[crop]['p_base']+.04*(5-etc)))
        values=bucket_day(storage,capacity,rain,etc,p,irrigation=forcing.get('irrigation_mm',0.),runoff_fraction=runoff_fraction)
        storage=values['storage_end_mm']
        rows.append({'day_utc':day.isoformat(),'days_after_sowing':index,'phase':phase,'kc':kc,'et0_mm':forcing['et0_mm'],
                     'historical_rain_mm':forcing['rain_mm'],'rain_removed_mm':forcing['rain_mm']-rain,**values})
    return rows
