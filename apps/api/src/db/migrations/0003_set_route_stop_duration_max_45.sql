PRAGMA foreign_keys=OFF;

CREATE TABLE route_stops_new (
  id TEXT PRIMARY KEY NOT NULL,
  route_id TEXT NOT NULL,
  venue_id TEXT NOT NULL,
  route_order INTEGER NOT NULL,
  planned_duration_minutes INTEGER NOT NULL DEFAULT 45,
  walk_label TEXT,
  CONSTRAINT route_stops_route_order_check CHECK(route_order > 0),
  CONSTRAINT route_stops_planned_duration_minutes_check CHECK(planned_duration_minutes > 0 AND planned_duration_minutes <= 45),
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE RESTRICT
);

INSERT INTO route_stops_new (
  id,
  route_id,
  venue_id,
  route_order,
  planned_duration_minutes,
  walk_label
)
SELECT
  id,
  route_id,
  venue_id,
  route_order,
  CASE
    WHEN planned_duration_minutes > 45 THEN 45
    ELSE planned_duration_minutes
  END,
  walk_label
FROM route_stops;

DROP TABLE route_stops;

ALTER TABLE route_stops_new RENAME TO route_stops;

CREATE UNIQUE INDEX route_stops_route_id_route_order_unique
  ON route_stops(route_id, route_order);

CREATE UNIQUE INDEX route_stops_route_id_venue_id_unique
  ON route_stops(route_id, venue_id);

CREATE INDEX idx_route_stops_route
  ON route_stops(route_id);

PRAGMA foreign_keys=ON;
