"""
RoutePool PostGIS & Spatial Geometry Architecture.
Provides SQLite-compatible PointField & LineStringField fallbacks using standard Django models.JSONField.
"""
from typing import Optional, List, Tuple
import math
from django.db import models


class PointField(models.JSONField):
    """
    Standard SQLite-compatible spatial Point field storing GeoJSON / [lng, lat] coordinate pairs.
    """
    description = "Geographic Point fallback field (longitude, latitude)"

    def __init__(self, *args, **kwargs):
        kwargs.pop('geography', None)
        kwargs.pop('srid', None)
        kwargs.pop('spatial_index', None)
        kwargs.setdefault('null', True)
        kwargs.setdefault('blank', True)
        super().__init__(*args, **kwargs)

    def get_prep_value(self, value):
        if value is None:
            return None
        if hasattr(value, 'to_dict'):
            value = value.to_dict()
        elif hasattr(value, 'coords'):
            value = {'type': 'Point', 'coordinates': list(value.coords)}
        return super().get_prep_value(value)

    def from_db_value(self, value, expression, connection):
        data = super().from_db_value(value, expression, connection)
        if data and isinstance(data, dict) and data.get('coordinates'):
            coords = data['coordinates']
            return Point(coords[0], coords[1])
        return data


class LineStringField(models.JSONField):
    """
    Fallback spatial LineString field storing polyline coordinates
    when PostGIS C-libraries (GEOS/GDAL) are not linked in the local environment.
    """
    description = "Geographic LineString fallback field (corridor polyline)"

    def __init__(self, *args, **kwargs):
        kwargs.pop('geography', None)
        kwargs.pop('srid', None)
        kwargs.pop('spatial_index', None)
        kwargs.setdefault('null', True)
        kwargs.setdefault('blank', True)
        super().__init__(*args, **kwargs)

    def get_prep_value(self, value):
        if value is None:
            return None
        if hasattr(value, 'to_dict'):
            value = value.to_dict()
        elif hasattr(value, 'coords'):
            value = {'type': 'LineString', 'coordinates': [list(c) for c in value.coords]}
        return super().get_prep_value(value)

    def from_db_value(self, value, expression, connection):
        data = super().from_db_value(value, expression, connection)
        if data and isinstance(data, dict) and data.get('coordinates'):
            return LineString(data['coordinates'])
        return data


class Point:
    """Lightweight Point object compatible with GEOS Point (x=lng, y=lat)."""
    def __init__(self, x: float = 0.0, y: float = 0.0, srid: int = 4326):
        self.x = float(x)  # Longitude
        self.y = float(y)  # Latitude
        self.srid = srid

    @property
    def coords(self) -> Tuple[float, float]:
        return (self.x, self.y)

    def to_dict(self):
        return {'type': 'Point', 'coordinates': [self.x, self.y], 'srid': self.srid}

    def __iter__(self):
        yield self.x
        yield self.y

    def __repr__(self):
        return f"POINT ({self.x} {self.y})"


class LineString:
    """Lightweight LineString object compatible with GEOS LineString."""
    def __init__(self, coords: Optional[List[Tuple[float, float]]] = None, srid: int = 4326):
        self.coords = list(coords or [])
        self.srid = srid

    def to_dict(self):
        return {'type': 'LineString', 'coordinates': self.coords, 'srid': self.srid}

    def __iter__(self):
        return iter(self.coords)

    def __repr__(self):
        coords_str = ", ".join(f"{x} {y}" for x, y in self.coords)
        return f"LINESTRING ({coords_str})"


def create_point(lat: Optional[float], lng: Optional[float], srid: int = 4326) -> Optional[Point]:
    """Helper to create a PostGIS Point safely in (longitude, latitude) EPSG:4326 format."""
    if lat is None or lng is None:
        return None
    try:
        return Point(float(lng), float(lat), srid=srid)
    except Exception:
        return None


def create_linestring(coordinates: List[Tuple[float, float]], srid: int = 4326) -> Optional[LineString]:
    """
    Helper to create a PostGIS LineString from a list of coordinates.
    Input can be [(lng, lat), ...] or [(lat, lng), ...] if inverted=True.
    Requires at least 2 points for a valid LineString.
    """
    if not coordinates or len(coordinates) < 2:
        return None
    try:
        clean_coords = [(float(pt[0]), float(pt[1])) for pt in coordinates]
        return LineString(clean_coords, srid=srid)
    except Exception:
        return None


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two geographic coordinates in kilometers."""
    R = 6371.0  # Earth radius in kilometers
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 3)
