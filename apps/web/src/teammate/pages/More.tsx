import { Link } from 'react-router-dom';
import { ChevronRight, CircleUserRound, MapPin, Palette } from 'lucide-react';
import { NAV } from '../App';
export function More() { return <div className="page"><h1>Mais</h1><ul className="list">{[...NAV.filter((n) => !('mobile' in n)), { to: '/propriedades', label: 'Propriedades e talhões', icon: MapPin }, { to: '/conta', label: 'Conta', icon: CircleUserRound }, { to: '/design-preview', label: 'Linguagem visual', icon: Palette }].map((n) => <li key={n.to}><Link className="btn" style={{ width: '100%', justifyContent: 'space-between' }} to={n.to}><span className="row"><n.icon size={20} aria-hidden />{n.label}</span><ChevronRight size={18} aria-hidden /></Link></li>)}</ul></div>; }
