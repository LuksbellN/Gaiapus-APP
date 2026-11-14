"""Request errors for the soybean and second-season maize yield endpoint."""
import re


def check_yield_request(crop, municipality_code, eligible_by_crop):
    """Check the crop and code against the coverage for the requested snapshot."""
    if not isinstance(crop, str) or crop not in ('soy', 'maize2'):
        reason = 'invalid_crop'
    elif not isinstance(municipality_code, str) or not re.fullmatch(r'[0-9]{7}', municipality_code):
        reason = 'invalid_municipality_code'
    elif municipality_code not in eligible_by_crop.get(crop, ()):
        reason = 'municipality_not_covered'
    else:
        return None
    return {'schema_version': '1.0.0', 'product': 'yield_estimate',
            'error': {'code': reason}}
