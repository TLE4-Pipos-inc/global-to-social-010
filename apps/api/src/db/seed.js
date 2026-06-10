import bcrypt from "bcrypt"
import { and, eq, isNull } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/db/client.js"
import { conversationStarters, interests, users, venues } from "@/db/schema.js"

const userSeedData = [
  {
    name: "Test Student",
    email: "test@example.com",
    password: "Password123!",
    school: "Hogeschool Rotterdam",
    campus: "Kralingse Zoom",
    role: "user",
  },
]

const interestSeedData = [
  "Music",
  "Food",
  "Sports",
  "Travel",
  "Gaming",
  "Culture",
  "Languages",
  "Nightlife",
  "Quiet chats",
  "Theme parks",
  "Photography",
  "Movies",
  "Reading",
  "Art & Design",
  "Fitness & Gym",
  "Karaoke",
  "Beach days",
  "Museums",
  "Fashion",
  "Nature",
  "Animals",
]

const venueSeedData = [
  {
    name: "BrewDog Rotterdam",
    venueType: "bar",
    address: "Witte de Withstraat 83, 3012 BN Rotterdam",
    description: "Busy student nightlife bar and central party hub in Rotterdam city center.",
    latitude: 51.91537585257126,
    longitude: 4.475666441833537,
    suggestedOrder: "start",
    vibe: "high energy nightlife and student crowd",
  },
  {
    name: "Cafe restaurant Erasmus",
    venueType: "restaurant",
    address: "Stadhuisplein 23, Rotterdam",
    description: "Stylish cocktail and dining bar transitioning into nightlife.",
    latitude: 51.91897901259875,
    longitude: 4.481015142324509,
    suggestedOrder: "early stop",
    vibe: "cocktails and social dining",
  },
  {
    name: "Cafe 't Fust",
    venueType: "bar",
    address: "Stadhuisplein 23, Rotterdam",
    description: "The oldest café on Stadhuisplein, can you still imagine? Such a different city and era, but still the familiar café.",
    latitude: 51.92248506330943,
    longitude: 4.477184435187327,
    suggestedOrder: "early stop",
    vibe: "dinner to party transition",
  },
  {
    name: "Beau Restobar",
    venueType: "bar",
    address: "Stadhuisplein 23, 3012 AR Rotterdam",
    description: "Restaurant bar that shifts into a lively night crowd later in the evening.",
    latitude: 51.9225082148123,
    longitude: 4.476998021039504,
    suggestedOrder: "early stop",
    vibe: "dinner to party transition",
  },
  {
    name: "Bokaal",
    venueType: "bar",
    address: "Nieuwemarkt 11, Rotterdam",
    description: "Craft beer bar popular with groups and casual drinkers.",
    latitude: 51.92246430151668,
    longitude: 4.488385368822203,
    suggestedOrder: "mid stop",
    vibe: "craft beer and social groups",
  },
  {
    name: "Biergarten Rotterdam",
    venueType: "bar",
    address: "Schiestraat 18, Rotterdam",
    description: "Large open beer hall with long tables, DJs, and group energy.",
    latitude: 51.925431867492144,
    longitude: 4.476302831137676,
    suggestedOrder: "mid stop",
    vibe: "group drinking and DJ energy",
  },
  {
    name: "Sijf",
    venueType: "bar",
    address: "Oude Binnenweg 115, Rotterdam",
    description: "Classic brown café with relaxed atmosphere for conversations.",
    latitude: 51.91746480752428,
    longitude: 4.474279318970599,
    suggestedOrder: "relax stop",
    vibe: "chill drinks and conversation",
  },

  {
    name: "Witte de Aap",
    venueType: "bar",
    address: "Witte de Withstraat 78, Rotterdam",
    description: "Iconic international bar always full of students, travelers and locals.",
    latitude: 51.91543052803871,
    longitude: 4.476314755206046,
    suggestedOrder: "late stop",
    vibe: "international nightlife crowd",
  },
  {
    name: "Bar3",
    venueType: "bar",
    address: "Nieuwe Binnenweg 17, Rotterdam",
    description: "Alternative bar with music, arcade feel and late-night crowd.",
    latitude: 51.91699994266714,
    longitude: 4.471886933284131,
    suggestedOrder: "late stop",
    vibe: "alternative nightlife and music",
  },
  {
    name: "Wunderbar",
    venueType: "bar",
    address: "Boomgaardsstraat 71, Rotterdam",
    description: "Underground cultural bar with experimental music and late-night events.",
    latitude: 51.91575741591754,
    longitude: 4.476434284465318,
    suggestedOrder: "final stop",
    vibe: "underground nightlife and events",
  }
]

const starterSeedData = [
  [null, "general", "What brought you here today?", 0],
  [null, "general", "Have you been to this place before?", 5],
  [null, "general", "What's been the best part of your week so far?", 10],
  [null, "general", "Are you here with friends or meeting new people?", 15],
  [null, "general", "What kind of places do you usually like to visit?", 20],
  [null, "general", "What's something fun you're looking forward to?", 25],
  [
    null,
    "general",
    "Do you prefer calm conversations or energetic group activities?",
    30,
  ],
  [null, "general", "What's your go-to way to start a weekend?", 35],
  [null, "general", "What's something that made you laugh recently?", 40],
  [null, "general", "How would you describe your ideal night out?", 45],
  [
    null,
    "general",
    "What's one thing you always notice when you enter a new place?",
    0,
  ],
  [null, "general", "Are you more of a planner or a spontaneous person?", 5],
  [
    null,
    "general",
    "What's a small thing that can instantly improve your day?",
    10,
  ],
  [null, "general", "What's your favorite way to spend time with friends?", 15],
  [
    null,
    "general",
    "Do you prefer meeting people one-on-one or in groups?",
    20,
  ],
  [null, "general", "What's something new you tried recently?", 25],
  [
    null,
    "general",
    "What's a place in the city you think everyone should visit?",
    30,
  ],
  [
    null,
    "general",
    "What's the best recommendation someone gave you lately?",
    35,
  ],
  [
    null,
    "general",
    "What kind of atmosphere makes you feel most comfortable?",
    40,
  ],
  [null, "general", "What's your favorite kind of event to go to?", 45],
  [null, "general", "What's something you could talk about for hours?", 0],
  [null, "general", "Do you prefer busy places or quiet corners?", 5],
  [
    null,
    "general",
    "What's one thing people are usually surprised to learn about you?",
    10,
  ],
  [null, "general", "What's your favorite way to relax after a long day?", 15],
  [
    null,
    "general",
    "What's the most interesting conversation you've had recently?",
    20,
  ],
  [
    null,
    "general",
    "If you could invite anyone to join this table, who would it be?",
    25,
  ],
  [null, "general", "What's something you're currently curious about?", 30],
  [null, "general", "What's your favorite hidden gem in the city?", 35],
  [
    null,
    "general",
    "What's a simple question that always starts a good conversation?",
    40,
  ],
  [null, "general", "What kind of people do you usually click with?", 45],
  ["Music", "music", "What's the last song you had on repeat?", 0],
  ["Music", "music", "Which artist would you drop everything to see live?", 5],
  ["Music", "music", "What's an underrated genre everyone should try?", 10],
  ["Music", "music", "What's a song that instantly improves your mood?", 15],
  [
    "Music",
    "music",
    "If you could create the perfect festival lineup, who's headlining?",
    20,
  ],
  ["Food", "food", "What's the best meal you've had?", 0],
  ["Food", "food", "Sweet or savory, what wins every time?", 5],
  ["Food", "food", "What's a food you'll never get tired of?", 10],
  [
    "Food",
    "food",
    "If you could only eat one cuisine for a month, what would it be?",
    15,
  ],
  ["Food", "food", "What's a local restaurant everyone should know about?", 20],
  ["Sports", "sports", "Do you prefer playing sports or watching them?", 0],
  ["Sports", "sports", "What's the most exciting sporting event?", 5],
  ["Sports", "sports", "Which sports would you love to get better at?", 10],
  ["Sports", "sports", "Who's your favorite athlete?", 15],
  ["Sports", "sports", "What's your favorite sports memory?", 20],
  ["Travel", "travel", "What's the next place on your travel bucket list?", 0],
  ["Travel", "travel", "Window seat or aisle seat?", 5],
  ["Travel", "travel", "What's the coolest place you've ever visited?", 10],
  ["Travel", "travel", "Do you prefer city trips or nature escapes?", 15],
  ["Travel", "travel", "What's one country you'd move to for a year?", 20],
  ["Gaming", "gaming", "What's your all-time favorite game?", 0],
  [
    "Gaming",
    "gaming",
    "Are you more into multiplayer or single-player games?",
    5,
  ],
  ["Gaming", "gaming", "Which game deserves a sequel?", 10],
  ["Gaming", "gaming", "PC, console or mobile?", 15],
  ["Gaming", "gaming", "What's the funniest gaming moment you've had?", 20],
  [
    "Culture",
    "culture",
    "Is there a tradition from another country you'd love to experience?",
    0,
  ],
  [
    "Culture",
    "culture",
    "What's a cultural event everyone should attend once?",
    5,
  ],
  [
    "Culture",
    "culture",
    "Have you ever celebrated a holiday from another culture?",
    10,
  ],
  ["Culture", "culture", "What's your favorite international dish?", 15],
  ["Culture", "culture", "Which country fascinates you the most?", 20],
  ["Languages", "languages", "What's a language you'd love to learn?", 0],
  [
    "Languages",
    "languages",
    "What's your favorite word in another language?",
    5,
  ],
  [
    "Languages",
    "languages",
    "Have you ever had a funny translation mistake?",
    10,
  ],
  [
    "Languages",
    "languages",
    "Which language sounds the most beautiful to you?",
    15,
  ],
  [
    "Languages",
    "languages",
    "Do you use language-learning apps or prefer real conversations?",
    20,
  ],
  ["Nightlife", "nightlife", "What's your ideal night out?", 0],
  ["Nightlife", "nightlife", "Live music venue or club?", 5],
  ["Nightlife", "nightlife", "What's the latest you've stayed out?", 10],
  ["Nightlife", "nightlife", "What's your favorite city for nightlife?", 15],
  [
    "Nightlife",
    "nightlife",
    "Are you the planner or the spontaneous friend?",
    20,
  ],
  [
    "Quiet chats",
    "quiet-chats",
    "What's something you've been thinking about lately?",
    0,
  ],
  [
    "Quiet chats",
    "quiet-chats",
    "What's a small thing that always makes your day better?",
    5,
  ],
  ["Quiet chats", "quiet-chats", "Morning person or night owl?", 10],
  [
    "Quiet chats",
    "quiet-chats",
    "What's a hobby you wish you had more time for?",
    15,
  ],
  [
    "Quiet chats",
    "quiet-chats",
    "What's the best conversation you've ever had?",
    20,
  ],
  ["Theme parks", "theme-parks", "Roller coaster or water rides?", 0],
  [
    "Theme parks",
    "theme-parks",
    "What's the best theme park you've visited?",
    5,
  ],
  ["Theme parks", "theme-parks", "Do you go for the rides or the snacks?", 10],
  [
    "Theme parks",
    "theme-parks",
    "Which fictional world deserves its own theme park?",
    15,
  ],
  [
    "Theme parks",
    "theme-parks",
    "What's the ride you'll always go on twice?",
    20,
  ],
  [
    "Photography",
    "photography",
    "What's your favorite thing to photograph?",
    0,
  ],
  ["Photography", "photography", "Phone camera or dedicated camera?", 5],
  ["Photography", "photography", "Sunrise or sunset photos?", 10],
  [
    "Photography",
    "photography",
    "What's the best photo you've ever taken?",
    15,
  ],
  [
    "Photography",
    "photography",
    "If you could photograph anywhere in the world, where would you go?",
    20,
  ],
  ["Movies", "movies", "What's a movie you can watch over and over?", 0],
  ["Movies", "movies", "What's the most underrated film you've seen?", 5],
  ["Movies", "movies", "Comedy, thriller or sci-fi?", 10],
  ["Movies", "movies", "Which movie has the best soundtrack?", 15],
  ["Movies", "movies", "What's the last movie that surprised you?", 20],
  [
    "Reading",
    "reading",
    "What's your favorite book that takes place in the 20th century?",
    0,
  ],
  ["Reading", "reading", "What's the last book you couldn't put down?", 5],
  ["Reading", "reading", "Which book do you recommend to everyone?", 10],
  ["Reading", "reading", "Fiction or non-fiction?", 15],
  ["Reading", "reading", "What's a fictional world you'd love to visit?", 20],
  [
    "Art & Design",
    "art-design",
    "What's the coolest piece of art you've seen in person?",
    0,
  ],
  ["Art & Design", "art-design", "Which artist inspires you the most?", 5],
  [
    "Art & Design",
    "art-design",
    "If you could decorate a room any way you wanted, what would it look like?",
    10,
  ],
  [
    "Art & Design",
    "art-design",
    "Is there a creative project you would love to start?",
    15,
  ],
  [
    "Art & Design",
    "art-design",
    "What's a place that gave you a lot of creative inspiration?",
    20,
  ],
  [
    "Fitness & Gym",
    "fitness-gym",
    "What's your favorite workout and why is it legs?",
    0,
  ],
  [
    "Fitness & Gym",
    "fitness-gym",
    "What's a fitness goal you're working on, and why?",
    5,
  ],
  ["Fitness & Gym", "fitness-gym", "Morning gym or evening gym?", 10],
  [
    "Fitness & Gym",
    "fitness-gym",
    "What is your bench PR? Okay, now what is your real bench PR?",
    15,
  ],
  ["Fitness & Gym", "fitness-gym", "What's the best post-workout snack?", 20],
  ["Karaoke", "karaoke", "What's your favorite karaoke song?", 0],
  [
    "Karaoke",
    "karaoke",
    "How many drinks until you get less awkward at singing?",
    5,
  ],
  [
    "Karaoke",
    "karaoke",
    "What's a song you would never dare to sing in public?",
    10,
  ],
  ["Karaoke", "karaoke", "Solo karaoke or group sing-along?", 15],
  ["Karaoke", "karaoke", "Who do you think you sing like?", 20],
  [
    "Beach days",
    "beach-days",
    "If you could plan a beach day with friends, what would you do first?",
    0,
  ],
  [
    "Beach days",
    "beach-days",
    "Someone says that going to the pool is better than going to the beach. What do you say?",
    5,
  ],
  ["Beach days", "beach-days", "Swimming or relaxing in the sand?", 10],
  ["Beach days", "beach-days", "What's your ideal beach snack?", 15],
  [
    "Beach days",
    "beach-days",
    "Would you rather go on a walk or go on a run?",
    20,
  ],
  ["Museums", "museums", "What's your favorite type of museum?", 0],
  ["Museums", "museums", "Which museum is on your bucket list?", 5],
  [
    "Museums",
    "museums",
    "Have you ever spent long looking at one exhibit and why?",
    10,
  ],
  ["Museums", "museums", "History, science or modern art?", 15],
  [
    "Museums",
    "museums",
    "What museum would you recommend to someone visiting your city? And why that one?",
    20,
  ],
  [
    "Fashion",
    "fashion",
    "You have EUR 200 to spend, what outfit would you create?",
    0,
  ],
  ["Fashion", "fashion", "What is the most overrated brand?", 5],
  ["Fashion", "fashion", "Streetwear or formal attire?", 10],
  ["Fashion", "fashion", "What's one item you wear all the time?", 15],
  [
    "Fashion",
    "fashion",
    "If you could swap wardrobes with anyone for a day, who would it be?",
    20,
  ],
  ["Nature", "nature", "What's your favorite outdoor activity?", 0],
  [
    "Nature",
    "nature",
    "Have you ever seen a breathtaking natural view? And where?",
    5,
  ],
  ["Nature", "nature", "What's your perfect weather for being outside?", 10],
  [
    "Nature",
    "nature",
    "If you could spend a week in nature anywhere, where would you go?",
    15,
  ],
  ["Nature", "nature", "Mountains, forests or lakes?", 20],
  ["Animals", "animals", "Dogs or cats?", 0],
  ["Animals", "animals", "What's the cutest animal you've seen?", 5],
  [
    "Animals",
    "animals",
    "Have you ever volunteered or worked with animals?",
    10,
  ],
  ["Animals", "animals", "What's an animal fact that surprises people?", 15],
  [
    "Animals",
    "animals",
    "If you could have any animal as a pet, what would it be and why?",
    20,
  ],
]

function seedInterests() {
  let inserted = 0

  for (const name of interestSeedData) {
    const existingByName = db
      .select()
      .from(interests)
      .where(eq(interests.name, name))
      .get()

    if (existingByName) continue

    db.insert(interests).values({ id: uuidv4(), name }).run()
    inserted += 1
  }

  return inserted
}

async function seedUsers() {
  let inserted = 0
  const saltRounds = Number(process.env.SALT_ROUNDS ?? 12)

  for (const user of userSeedData) {
    const existingUser = db
      .select()
      .from(users)
      .where(eq(users.email, user.email))
      .get()

    if (existingUser) continue

    const passwordHash = await bcrypt.hash(user.password, saltRounds)

    db.insert(users)
      .values({
        id: uuidv4(),
        name: user.name,
        email: user.email,
        password: passwordHash,
        school: user.school,
        campus: user.campus,
        role: user.role,
      })
      .run()

    inserted += 1
  }

  return inserted
}

function seedVenues() {
  let inserted = 0

  for (const venue of venueSeedData) {
    const existingVenue = db
      .select()
      .from(venues)
      .where(
        and(eq(venues.name, venue.name), eq(venues.address, venue.address))
      )
      .get()

    if (existingVenue) continue

    db.insert(venues)
      .values({ id: uuidv4(), ...venue })
      .run()
    inserted += 1
  }

  return inserted
}

function getInterestIdsByName() {
  return new Map(
    db
      .select()
      .from(interests)
      .all()
      .map((interest) => [interest.name, interest.id])
  )
}

function seedConversationStarters() {
  const interestIdsByName = getInterestIdsByName()
  let inserted = 0

  for (const [
    interestName,
    category,
    prompt,
    triggerMinute,
  ] of starterSeedData) {
    const interestsId = interestName
      ? interestIdsByName.get(interestName)
      : null

    if (interestName && !interestsId) {
      console.warn(
        `Skipped starter "${prompt}": missing interest ${interestName}`
      )
      continue
    }

    const existingStarter = db
      .select()
      .from(conversationStarters)
      .where(
        and(
          interestsId
            ? eq(conversationStarters.interestsId, interestsId)
            : isNull(conversationStarters.interestsId),
          eq(conversationStarters.category, category),
          eq(conversationStarters.prompt, prompt),
          eq(conversationStarters.triggerMinute, triggerMinute)
        )
      )
      .get()

    if (existingStarter) continue

    const starter = {
      id: uuidv4(),
      interestsId,
      category,
      prompt,
      triggerMinute,
    }

    db.insert(conversationStarters).values(starter).run()
    inserted += 1
  }

  return inserted
}

const insertedUsers = await seedUsers()
const insertedInterests = seedInterests()
const insertedVenues = seedVenues()
const insertedConversationStarters = seedConversationStarters()

console.log("Seed complete")
console.log(`Users inserted: ${insertedUsers}`)
console.log(`Interests inserted: ${insertedInterests}`)
console.log(`Venues inserted: ${insertedVenues}`)
console.log(`Conversation starters inserted: ${insertedConversationStarters}`)
