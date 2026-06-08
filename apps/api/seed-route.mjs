import { db } from "./src/db/client.js";
import { routes, routeThemes, venues, routeStops } from "./src/db/schema.js";
import { v4 as uuidv4 } from "uuid";

console.log("Seeding test route data...");

const themeId = uuidv4();
const routeId = uuidv4();
const venue1Id = uuidv4();
const venue2Id = uuidv4();

try {
  db.transaction((tx) => {
    tx.insert(routeThemes).values({
      id: themeId,
      name: "Classic Pub Crawl",
      description: "A great starter route for a first time party.",
      mood: "casual",
      active: true,
    }).run();

    tx.insert(routes).values({
      id: routeId,
      themeId: themeId,
      name: "Oude Haven Route",
      area: "Oude Haven",
      city: "Rotterdam",
      routeType: "social",
      active: true,
    }).run();

    tx.insert(venues).values([
      {
        id: venue1Id,
        name: "Plan C",
        venueType: "bar",
        address: "Slepersvest 1, Rotterdam",
        description: "Cozy bar with a great terrace.",
        vibe: "energetic",
      },
      {
        id: venue2Id,
        name: "Apartt",
        venueType: "club",
        address: "Blaak 4, Rotterdam",
        description: "Music and drinks.",
        vibe: "loud",
      }
    ]).run();

    tx.insert(routeStops).values([
      {
        id: uuidv4(),
        routeId: routeId,
        venueId: venue1Id,
        routeOrder: 1,
        plannedDurationMinutes: 30,
        walkLabel: "Start here"
      },
      {
        id: uuidv4(),
        routeId: routeId,
        venueId: venue2Id,
        routeOrder: 2,
        plannedDurationMinutes: 45,
        walkLabel: "Walk heavily"
      }
    ]).run();
  });

  console.log("Seeding complete! You now have an active route.");
  console.log("Route ID:", routeId);
} catch (err) {
  console.error("Failed to seed (transaction rolled back):", err.message);
  process.exitCode = 1;
}

