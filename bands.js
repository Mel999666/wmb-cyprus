// bands.js
// Public showcase list for Wacken Metal Battle Cyprus
// Artist popularity is fetched from the Spotify ARTIST link (open.spotify.com/artist/...)
// The Spotify player embeds the explicit track given in spotifyEmbedTrack
// Manual bios and follower counts included

window.BANDS = [
  {
    name: "Black Strays",
    genre: "Hard Rock",
    city: "Limassol",
    youtube: "https://www.youtube.com/watch?v=P1BLK1hKqCM",
    liveYoutube: "",
    facebookUrl: "",
    // Artist URL must be the canonical open.spotify.com form for popularity
    spotify: "https://open.spotify.com/artist/3wd5EEv0qSkYnzSOMBZDPA?si=80BkHdkCRsu3Ex2hZYSu9Q",
    spotifyEmbedTrack: "https://open.spotify.com/track/1wbnZFIeKU96y6CoukmblU?si=e8c180767d9d4bc0",
    instagramUrl: "https://www.instagram.com/blackstraysband/",
    otherLinks: ["https://blackstrays.com/"],
    fbPageId: "",
    igUserId: "",
    bio: "From the vibrant shores of Cyprus emerges Black Strays, a powerhouse of rock'n'roll energy that's as gritty as it is groovy. With a sonic palette painted by groovy heavy riffs and infectious melodic choruses, the four piece band channels the essence of rock through a diverse range of influences spanning the eras from the 70s to the 90s. Their music resonates with echoes of classic rock, hard rock, grunge, stoner, progressive and blues rock, creating a sonic tapestry that's both timeless and innovative. Adding a unique twist to their sound, Black Strays infuse traditional Greek/Cypriot elements, elevating their music to new heights and offering audiences a fresh and exhilarating experience. Prepare to embark on a sonic journey where thunderous rhythms collide with soul-stirring melodies, transporting you to a realm where music transcends time and space. Described as 'Dirty Groovy Rock n Roll'.",
    manualStats: { facebookFollowers: 0, instagramFollowers: 8522 }
  },
  {
    name: "Blynd",
    genre: "Melodic Death Metal",
    city: "Nicosia",
    youtube: "https://www.youtube.com/watch?v=WWB__yACzhw&list=RDWWB__yACzhw&start_radio=1",
    liveYoutube: "https://www.youtube.com/watch?v=pMBFb8RFJ_s",
    facebookUrl: "https://www.facebook.com/blyndmetal/",
    spotify: "https://open.spotify.com/artist/5CgHUnYxF7RGMsD5BYY0lP",
    spotifyEmbedTrack: "https://open.spotify.com/track/4ePdz39CP1zXYm3n7H5VKD?si=47b8d1c6e34c4737",
    instagramUrl: "https://www.instagram.com/blyndmetal/",
    fbPageId: "",
    igUserId: "",
    bio: "Extreme Metal Band from the island of Cyprus",
    manualStats: { facebookFollowers: 5900, instagramFollowers: 1346 }
  },
  {
    name: "Guiltera",
    genre: "Metalcore 4. Wave",
    city: "Limassol",
    youtube: "https://www.youtube.com/watch?v=gvQGIsr6oHc",
    liveYoutube: "https://www.youtube.com/watch?v=6psThjXBgYs",
    facebookUrl: "https://www.facebook.com/profile.php?id=61559603642016",
    spotify: "https://open.spotify.com/artist/3Zn5DaI82ti9N0TLUd3LqQ?si=gOsbk8WDQsuN2L7ZQRAaoQ&nd=1&dlsi=4c000821b8874bec",
    spotifyEmbedTrack: "https://open.spotify.com/track/0OeaPhxEB3rQnSQRpaqfa4?si=f80047cc9e6c4493",
    instagramUrl: "https://www.instagram.com/guiltera_band/",
    fbPageId: "",
    igUserId: "",
    bio: "We are a female-fronted hard rock / alternative metal band from Cyprus formed in 2024. This is heavy music which is easy to listen to. We are traditional four-piece rock band consisting of vocalist Vikki Arkharova, guitarist Alex Logvinov, bassist Sergei Kovalev and drummer Viacheslav Karaganov.",
    manualStats: { facebookFollowers: 78, instagramFollowers: 3546 }
  },
  {
    name: "Ka'aper",
    genre: "Dark Metal",
    city: "Limassol",
    youtube: "https://www.youtube.com/watch?v=ASzy9bWighQ",
    liveYoutube: "",
    facebookUrl: "https://www.facebook.com/profile.php?id=61561403806389",
    spotify: "https://open.spotify.com/artist/4T0bImsYNQXp9JdY1RBzEu?si=ZVC-qI2iR4yviW0ioI41GQ",
    spotifyEmbedTrack: "https://open.spotify.com/track/7jEEO3ydcqxzLl4YHNufZF?si=fb263213c1d04278",
    instagramUrl: "https://www.instagram.com/kaaper_official/",
    fbPageId: "",
    igUserId: "",
    bio: "Pitch-black darkness was spawned on the southern shore of the island of Cyprus in April 2024. Inspired by myths of ancient Egypt, scorched by the relentless sun and embraced by the desert wind, KA'APER blended different styles of dark and melodic metal, combining bone-crushing riffs and vocals with catchy melodies and atmospheric ambiances. The project has some blood-chilling stories — tales of times when ancient gods walked the Earth and the Nile was young. Welcome to the darkest of times...",
    manualStats: { facebookFollowers: 236, instagramFollowers: 1616 }
  },
  {
    name: "Leave the Wave",
    genre: "Hard Rock",
    city: "Nicosia",
    youtube: "https://www.youtube.com/watch?v=Ocef41DXZOk",
    liveYoutube: "https://www.youtube.com/watch?v=EwDCMB4Eidk",
    facebookUrl: "https://www.facebook.com/share/1HDsTp1voH/?mibextid=wwXIfr",
    // Canonical artist URL to ensure popularity loads
    spotify: "https://open.spotify.com/artist/7ftPQLoFzTHVJfR8CU8fZ7",
    spotifyEmbedTrack: "https://open.spotify.com/track/1G9kUMEaLa0SJufwgMwBu8?si=4fc967724df64d1a",
    instagramUrl: "https://www.instagram.com/leavethewave/",
    fbPageId: "",
    igUserId: "",
    bio: "Rock band based in Nicosia, CY",
    manualStats: { facebookFollowers: 398, instagramFollowers: 1126 }
  },
  {
    name: "LIOMENO TOU",
    genre: "Stoner Metal",
    city: "Nicosia",
    youtube: "https://www.youtube.com/watch?v=PRR1Ux5_jdw",
    liveYoutube: "",
    facebookUrl: "",
    spotify: "https://open.spotify.com/artist/42urAzC6JTEaXNRLymuKX0?si=2kexHh_LSDabsJs8Gh0eJQ",
    spotifyEmbedTrack: "https://open.spotify.com/track/0oQXAm5hYJnQE9J5UHWcUO?si=f9de392ea38945ff",
    instagramUrl: "https://www.instagram.com/liomeno.tou",
    fbPageId: "",
    igUserId: "",
    bio: "",
    manualStats: { facebookFollowers: 0, instagramFollowers: 70 }
  },
  {
    name: "MARANG.",
    genre: "Progressive Metal",
    city: "Nicosia",
    youtube: "https://www.youtube.com/watch?v=auaVFa2oX7A",
    liveYoutube: "",
    facebookUrl: "https://www.facebook.com/share/17VciyNjMH/?mibextid=wwXIfr",
    // Replaced shortlink with canonical artist URL so popularity fetch works
    spotify: "https://open.spotify.com/artist/4FbAc7bDc2HbqEk4sS8axr",
    spotifyEmbedTrack: "https://open.spotify.com/track/2snDyzpNsq2b8veeCOR3Sg?si=df7c052fc82246a9",
    instagramUrl: "https://www.instagram.com/stephanosmarangos/",
    fbPageId: "",
    igUserId: "",
    bio: "Marang. is a Greek-Cypriot Composer, Producer, and multi-instrumentalist who focuses on heavy instrumental progressive music, including influences from jazz and fusion. Growing up in a musical environment he was exposed to diverse kinds of music from an early age. On his upcoming release, he had the opportunity to work with musicians such as John Waugh (The 1975, Plini), Chris Alisson (Plini, Nick Johnston, David Maxim Micic), Anup Sastry (Devin Townsend, Marty Friedman, Monuments), and Jack Gardiner (Stu Hamm). On the production and engineering part, he closely collaborated with producer extraordinaire Pete Smith (Sting, Gary Moore), mastering engineer, Acle Kahney (Tesseract), and mixing engineer Philip Zilfo. MARANG's 'Metamorphosis' EP showcases his passion and dedication to creating compelling instrumental music. 'Fractured Steps embodies captivating guitar lines, mesmerizing saxophone solos, and dynamic drum grooves.",
    manualStats: { facebookFollowers: 0, instagramFollowers: 2403 }
  },
  {
    name: "Salienzor",
    genre: "Metalcore 3. Wave",
    city: "Nicosia",
    youtube: "https://www.youtube.com/watch?v=P-rovmbnWFY",
    liveYoutube: "https://www.youtube.com/watch?v=P-rovmbnWFY", // same as featured per your file
    facebookUrl: "https://www.facebook.com/profile.php?id=61552235609980",
    spotify: "https://open.spotify.com/artist/3z5HqSTma8Jo3riI30C8NI?si=MSo5FM2aSZ-eiWPxMgEZzg",
    spotifyEmbedTrack: "https://open.spotify.com/track/3WWw1AXpFWmO8sb7kS496o?si=6d2f9261cf4f477d",
    instagramUrl: "https://www.instagram.com/salienzor/",
    fbPageId: "",
    igUserId: "",
    bio: "Modern Metal Band formed in Nicosia, Cyprus in 2024",
    manualStats: { facebookFollowers: 18, instagramFollowers: 337 }
  },
  {
    name: "Speak In Whispers",
    genre: "Groove Metal",
    city: "Larnaka",
    youtube: "https://www.youtube.com/watch?v=AQ7C-HvyDhY",
    liveYoutube: "https://www.youtube.com/watch?v=qqOVXZn-x24",
    facebookUrl: "https://www.facebook.com/speakinwhispers",
    spotify: "https://open.spotify.com/artist/61Usxx24TwxGUlTUhE2S4u",
    spotifyEmbedTrack: "https://open.spotify.com/track/2k4EOCyRrBmNBdMzHACUMx?si=a53a2b3a7ae94341",
    instagramUrl: "https://www.instagram.com/speak.in.whispers/",
    otherLinks: ["https://www.speakinwhispers.com/"],
    fbPageId: "",
    igUserId: "",
    bio: "Speak In Whispers is a progressive groove metal band founded in 2017 in Cyprus. Over the years, Speak In Whispers has become a mainstay in the live music scene, earning recognition for their high-energy performances and intricate yet groove-heavy sound. The band has performed at numerous festivals including Bloodstock Open Air 2025 and shared the stage with renowned acts such as Freak Kitchen, Rage, Poem, Planet of Zeus, Welicoruss, and others. Their reputation as a dynamic live act continues to grow, garnering acclaim for their technical prowess and engaging stage presence. In 2020, Speak In Whispers independently released their debut EP, The Dark Descent, showcasing their distinct style and musical depth. Building on this momentum, they have released their highly anticipated full-length album, Crystalline Structures, on March 28th 2025 through M&O Music",
    manualStats: { facebookFollowers: 1300, instagramFollowers: 1092 }
  },
  {
    name: "YMNKY!",
    genre: "Alternative Metal",
    city: "Limassol",
    youtube: "https://music.youtube.com/watch?v=rEZiJ5eJZIs&list=OLAK5uy_ng2yWEC3ckQmcwvtsegQ6cMwv8facmzxM",
    liveYoutube: "https://music.youtube.com/watch?v=Z6nxx-0HGzo&list=OLAK5uy_lrVglzqnVEoZkOp9eZ5hkApPFU0aZslpM",
    facebookUrl: "https://www.facebook.com/ymnky.bnd",
    spotify: "https://open.spotify.com/artist/06EcVA3ORp4U1w2k29yVzG?si=g0DDz6WMQ0WwRiR65LIUww",
    spotifyEmbedTrack: "https://open.spotify.com/track/78f7EQD6Sch325NUQEQ0kC?si=93474ca7604d463e",
    instagramUrl: "https://www.instagram.com/ymnky_band/",
    fbPageId: "",
    igUserId: "",
    bio: "We are YMNKY!, a Cyprus-born alternative metal band with a mission to bend the genre's rules. Our sound? A daring mix of melodic vocals, rap, and screams, all set within a dark, captivating universe that unfolds with each track. Our music is an adventure, inviting you to dive deep into our unique, resonant world. YMNKY!'s music transcends boundaries, blending the raw energy of alternative metal, the catchiness of pop rock, and the experimental spirit of electronic rock. Their unique fusion of styles creates a sonic experience that is both powerful and melodically captivating, appealing to a diverse audience with varied musical tastes.",
    manualStats: { facebookFollowers: 48, instagramFollowers: 2648 }
  },
  {
    name: "Ars Notoria",
    genre: "Avantgarde",
    city: "Nicosia",
    youtube: "https://www.youtube.com/watch?v=iVxau8FoB7A",
    liveYoutube: "https://www.youtube.com/watch?v=zvKyYPwf-jk",
    facebookUrl: "https://www.facebook.com/share/1BDwKJQ9cH/?mibextid=wwXIfr",
    spotify: "https://open.spotify.com/artist/44aSlHINEZeiEqNWwn8bgd?si=VfQudrJITMiSNM0Ceby39Q",
    spotifyEmbedTrack: "https://open.spotify.com/track/683ndzqSKPXj2RPxxaJm60?si=40e6567ce81f4509",
    instagramUrl: "https://www.instagram.com/ars__notoria/",
    otherLinks: [],
    fbPageId: "",
    igUserId: "",
    bio: "We are Ars Notoria, a metal band based in Nicosia, Cyprus. Our music encompasses a fusion of different genres and unconventional vocal experimentation with Greek lyrics.",
    manualStats: { facebookFollowers: 597, instagramFollowers: 952 }
  }
];
