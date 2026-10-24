export const profile = {
  name: 'Sumit Kumar Ranjan',
  short: 'Sumit',
  role: 'Software Engineer · AI/ML',
  location: 'Chandigarh, India',
  email: 'sumitranjan2207@gmail.com',
  // Booking page for the "Let's talk" button, e.g. 'https://cal.com/sumitx99/30min'. Empty = opens an email.
  booking: 'https://cal.com/skranjan/30min?overlayCalendar=true',
  github: 'https://github.com/sumitx99',
  githubUser: 'sumitx99',
  linkedin: 'https://www.linkedin.com/in/sumitx99/',
  twitter: 'https://twitter.com/sumitx99',
}

export const roles = ['RAG systems', 'LLM apps', 'backend services', 'computer vision', 'full-stack products']

export const experience = [
  {
    company: 'Pharmaco Evidence',
    title: 'Software Engineer',
    period: 'Aug 2025 — Present',
    points: [
      'Building backend services and API integrations for AI-driven evidence products.',
      'Working with event streaming on Apache Kafka and microservices in FastAPI.',
    ],
    tags: ['FastAPI', 'Kafka', 'APIs', 'PostgreSQL'],
  },
  {
    company: 'EOXS',
    title: 'AI Generalist Intern',
    period: 'May 2025 — Aug 2025',
    points: [
      'Built AI modules inside the EOXS ERP for automation and predictive analytics.',
      'Designed ML models for demand forecasting and operational efficiency in the steel industry.',
    ],
    tags: ['Machine Learning', 'Forecasting', 'ERP', 'Python'],
  },
]

export const education = [
  {
    school: 'Chandigarh University',
    degree: 'B.E. Computer Science (AI & ML)',
    period: '2022 — 2026',
    place: 'Mohali, Punjab',
  },
  {
    school: 'Kendriya Vidyalaya Chandrapura',
    degree: 'Senior Secondary · Science',
    period: '2020 — 2022',
    place: 'Chandrapura, Jharkhand',
  },
]

// Shipped, deployed products — the only two shown on the home page.
export const projects = [
  {
    name: 'RideBridge',
    kind: 'Maps · Mobility',
    year: '2026',
    tagline: 'Your ride. Your exact spot.',
    blurb:
      'Ride apps fill your pickup from GPS but make you type the destination — and big places like colleges, hospitals and stations often land you at the wrong gate. RideBridge lets you pin the exact entrance on Google Maps and carries those coordinates straight into Uber or Rapido.',
    highlights: [
      'Search, voice input or tap-to-pin with exact lat/lng and place name',
      'Deep links into Uber; Android intents into Rapido',
      'Category chips for restaurants, cafes, hotels and more',
    ],
    stack: ['React 18', 'Vite', 'Google Maps', 'Places API'],
    images: ['/projects/ridebridge-1.jpg', '/projects/ridebridge-2.jpg'],
    live: 'https://ride-bridge-phi.vercel.app/',
    repo: 'https://github.com/sumitx99/RideBridge',
    accent: '#ef6c47',
  },
  {
    name: 'Kite',
    kind: 'SaaS · Marketplace',
    year: '2026',
    tagline: 'Software. Engineered for SaaS.',
    blurb:
      'A product marketplace that connects clients with vetted builders and runs the whole delivery: a dedicated team lead, milestone-based payments, daily progress updates and role-based access for clients, leads and admins. Built with a four-person team.',
    highlights: [
      'Story-driven landing with industry-specific heroes and delivery tiers',
      'Client order flow, milestones and invoices',
      'Team task boards, project chat and status tracking',
    ],
    stack: ['React', 'FastAPI', 'PostgreSQL', 'SaaS'],
    images: ['/projects/kite-1.jpg', '/projects/kite-2.jpg', '/projects/kite-3.jpg'],
    live: 'https://kite-frontend-1u77.onrender.com/',
    accent: '#3b5bdb',
  },
]

// Side builds and explorations — the Experiments page.
export const experiments = [
  {
    name: 'Sonia',
    kind: 'RAG · LLM',
    blurb:
      'A RAG chatbot built to fix slow ingestion and vague answers: batch embeddings, LlamaParse layout-aware parsing and two-stage retrieval (vector top-25 → cross-encoder top-5).',
    stack: ['FastAPI', 'Next.js', 'Gemini', 'LlamaParse'],
    repo: 'https://github.com/sumitx99/SONIA-AI',
  },
  {
    name: 'AI SQL Assistant',
    kind: 'NL → SQL',
    blurb:
      'Talk to a database in plain English. Turns prompts into executable SQL, confirms risky commands, renders results as tables and keeps multi-thread chat history.',
    stack: ['Flask', 'LangChain', 'Gemini', 'SQLite'],
    repo: 'https://github.com/sumitx99/AI-SQL-BOT',
    live: 'https://ai-sql-bot.vercel.app',
  },
  {
    name: 'Postura',
    kind: 'Computer Vision',
    blurb:
      'Turns a webcam into a form coach: auto-detects 10 exercises with pose estimation and joint-angle patterns, counts reps and gives color-coded posture feedback.',
    stack: ['Python', 'OpenCV', 'Pose estimation'],
    repo: 'https://github.com/sumitx99/Postura',
  },
  {
    name: 'Claim AI Assistant',
    kind: 'Text-to-SQL + RAG',
    blurb:
      'Upload insurance claims as CSV and ask questions. Structured questions go through Text-to-SQL on Postgres, reasoning-heavy ones through RAG, with streamed answers.',
    stack: ['React', 'FastAPI', 'Postgres', 'RAG'],
    repo: 'https://github.com/sumitx99/Claim-AI-Assistant',
  },
  {
    name: 'Market Predictor',
    kind: 'ML · Finance',
    blurb:
      'Desktop app that pulls prices with yfinance, builds indicators (MA, RSI, MACD, Bollinger) plus news sentiment, and predicts the next close with a Random Forest.',
    stack: ['scikit-learn', 'yfinance', 'VADER', 'Tkinter'],
    repo: 'https://github.com/sumitx99/Stock_predictor',
  },
  {
    name: 'J.A.R.V.I.S',
    kind: 'Voice AI',
    blurb: 'A desktop voice assistant: speech recognition in, Gemini for responses, text-to-speech out, in a Tkinter conversation UI.',
    stack: ['Python', 'Gemini', 'pyttsx3'],
    repo: 'https://github.com/sumitx99/J-A-R-V-I-S_Voice_assistant',
  },
  {
    name: 'IntelliTraffic',
    kind: 'Computer Vision',
    blurb: 'Detects vehicles from live feeds with YOLOv8 and adapts traffic-light timing to the load at the junction.',
    stack: ['YOLOv8', 'OpenCV', 'Python'],
    repo: 'https://github.com/sumitx99/Intelli_Traffic',
  },
  {
    name: 'ATS Resume Checker',
    kind: 'GenAI · Careers',
    blurb: 'Scores a resume against a job description, lists strengths, gaps and missing keywords using Gemini 1.5 Flash.',
    stack: ['Streamlit', 'Gemini'],
    repo: 'https://github.com/sumitx99/ATS-resume-checker',
  },
  {
    name: 'YouTube → Notes',
    kind: 'GenAI · Learning',
    blurb: 'Pulls a video’s transcript and turns it into detailed study notes with Gemini.',
    stack: ['Streamlit', 'Gemini'],
    repo: 'https://github.com/sumitx99/YouTube_Transcribe_Notes',
  },
  {
    name: 'Drug Review Sentiment',
    kind: 'NLP',
    blurb: 'Sentiment analysis over the UCI drug review dataset to rank medications per condition and seed a recommender.',
    stack: ['Pandas', 'NLP', 'Jupyter'],
    repo: 'https://github.com/sumitx99/Drug_Sentiment_Analysis',
  },
]

export const skills = {
  'AI / ML': ['PyTorch', 'TensorFlow', 'Keras', 'scikit-learn', 'LangChain', 'RAG', 'YOLOv8', 'OpenCV'],
  Backend: ['FastAPI', 'Flask', 'Kafka', 'Microservices', 'REST APIs'],
  Frontend: ['React', 'Next.js', 'TypeScript', 'Tailwind', 'Three.js'],
  'Data & Cloud': ['PostgreSQL', 'MySQL', 'AWS', 'Azure', 'Linux', 'Git'],
  Languages: ['Python', 'Java', 'C++', 'C', 'JavaScript'],
}

// Certificates and recognitions. `image` is a scan of the actual certificate; `url` is the issuer's verification link.
export const certifications = [
  {
    title: 'Oracle Cloud Infrastructure 2025 Certified Generative AI Professional',
    issuer: 'Oracle',
    date: 'Aug 2025',
    note: 'Valid until Aug 2027',
    id: '321775184OCI25GAIOCP',
    category: 'AI/ML',
    tags: ['Generative AI', 'OCI', 'LLMs'],
    image: '/certs/oracle.jpg',
    url: 'https://catalog-education.oracle.com/pls/certview/sharebadge?id=EA95073B7B29E13D01BAB9612CF07E8A8173C9440A7841D4B6B04FE94AE07395',
  },
  {
    title: 'Deloitte Australia — Data Analytics Job Simulation',
    issuer: 'Deloitte · Forage',
    date: 'Jun 2025',
    id: 'LexEM3tvwu3c4EQ4y',
    category: 'Data',
    tags: ['Data analysis', 'Forensic technology'],
    image: '/certs/deloitte.jpg',
    url: 'https://forage-uploads-prod.s3.amazonaws.com/completion-certificates/9PBTqmSxAf6zZTseP/io9DzWKe3PTsiS6GG_9PBTqmSxAf6zZTseP_ZmDxSFK8LRqG3AX8m_1751221469483_completion_certificate.pdf',
  },
  {
    title: 'Artificial Intelligence Analyst',
    issuer: 'IBM · Chandigarh University',
    date: 'May 2025',
    id: 'af3743ed2c054f6b836182217389055e',
    category: 'AI/ML',
    tags: ['Artificial intelligence', 'IBM Skills Network'],
    image: '/certs/cu-ai.jpg',
    url: 'https://courses.cu.skillsnetwork.site/certificates/af3743ed2c054f6b836182217389055e',
  },
  {
    title: 'Achievers Award',
    issuer: 'Chandigarh University',
    date: 'Apr 2025',
    note: 'Recognized for academic and extracurricular efforts',
    category: 'Recognition',
    tags: ['Academic achievement', 'Extracurricular excellence'],
    image: '/certs/achievers-award.jpg',
    photo: true,
    url: 'https://lnkd.in/p/gW9BE3ja',
  },
  {
    title: 'Advanced Data Analysis with Generative AI',
    issuer: 'Microsoft · Coursera',
    date: 'Apr 2025',
    category: 'Data',
    tags: ['Generative AI', 'Data analysis'],
    image: '/certs/ms-adv.jpg',
    url: 'https://www.coursera.org/account/accomplishments/certificate/I7D4E7VWEUJM',
  },
  {
    title: 'AI for Entrepreneurship',
    issuer: 'Intel · Skill India Digital Hub',
    date: 'Apr 2025',
    category: 'AI/ML',
    tags: ['AI', 'Entrepreneurship'],
    image: '/certs/skillindia.jpg',
    url: 'https://courses.skillindiadigital.gov.in/api/custom_api/view_certificate/882667c3bca54664a2061ddc10881560',
  },
  {
    title: 'Introduction to Generative AI for Data Analysis',
    issuer: 'Microsoft · Coursera',
    date: 'Mar 2025',
    category: 'Data',
    tags: ['Generative AI', 'LLMs'],
    image: '/certs/ms-intro.jpg',
    url: 'https://www.coursera.org/account/accomplishments/certificate/FYL1377YYHQE',
  },
  {
    title: 'Walmart USA — Advanced Software Engineering Job Simulation',
    issuer: 'Walmart Global Tech · Forage',
    date: 'Mar 2025',
    id: 'oEZ3pc7L54vJY3QkW',
    category: 'Software',
    tags: ['Data structures', 'Software architecture', 'Databases'],
    image: '/certs/walmart.jpg',
    url: 'https://forage-uploads-prod.s3.amazonaws.com/completion-certificates/prBZoAihniNijyD6d/oX6f9BbCL9kJDJzfg_prBZoAihniNijyD6d_ZmDxSFK8LRqG3AX8m_1741675467245_completion_certificate.pdf',
  },
  {
    title: 'Microsoft Certified: Azure AI Fundamentals',
    issuer: 'Microsoft',
    date: 'Jun 2024',
    note: 'Certiport wbmNn-FahH',
    category: 'Cloud',
    tags: ['Azure', 'AI fundamentals'],
    image: '/certs/azure.jpg',
    url: 'https://drive.google.com/file/d/10q8BiXzNII8KvBDA1SZ7wdykcKa-H3sQ/view',
  },
  {
    title: 'AWS Academy Graduate — AWS Academy Cloud Foundations',
    issuer: 'Amazon Web Services',
    date: 'Jun 2023',
    note: '20 course hours',
    category: 'Cloud',
    tags: ['AWS', 'Cloud'],
    image: '/certs/aws.jpg',
    url: 'https://www.credly.com/go/qclm8xyC',
  },
  {
    title: 'BIZINNOVATHON ’24 — 1st Runner-Up',
    issuer: 'Bajaj Allianz × Chandigarh University',
    date: 'Sep 2024',
    note: '₹15,000 prize + internship offers',
    category: 'Recognition',
    tags: ['Hackathon', 'Insurance', 'Team Neural Knights'],
    image: '/certs/bizinnovathon.jpg',
    photo: true,
  },
  {
    title: 'Hash It Out — Medal (CSI Star Awards)',
    issuer: 'Coding Ninjas',
    date: 'May 2024',
    category: 'Recognition',
    tags: ['Competitive coding'],
    image: '/certs/hash-it-out.jpg',
    photo: true,
  },
]

export const achievements = [
  {
    title: 'Research — Fake news classification with Graph Attention Networks',
    detail:
      'Cascade-Level Fake News Classification Using Graph Attention Networks over Diffusion Trees. Co-author; presented at BIDA 2026 (Springer).',
    year: '2026',
  },
  {
    title: 'BIZINNOVATHON ’24 — 1st Runner-Up',
    detail: 'Team Neural Knights, out of 100 teams. Hosted by Chandigarh University with Bajaj Allianz; ₹15,000 prize and internship offers.',
    year: '2024',
  },
  {
    title: 'Achievers Award',
    detail: 'Chandigarh University, for academic and extracurricular work.',
    year: '2025',
  },
  {
    title: 'Hash It Out — Medal',
    detail: 'Coding competition by Coding Ninjas.',
    year: '2024',
  },
  {
    title: 'Class Representative',
    detail: 'Bridged students and faculty and organized academic events.',
    year: '2024',
  },
]

// Snapshot from LinkedIn (Oct 2026); GitHub numbers on the Analytics page are fetched live.
export const linkedinStats = [
  ['3,392', 'LinkedIn followers'],
  ['500+', 'connections'],
  ['1,915', 'impressions on the AI SQL launch post'],
  ['202', 'reactions on the BIZINNOVATHON post'],
]

// Competitive programming stats from Codolio (snapshot, Oct 2026).
// The Coding page reads everything live from Codolio (api/codolio.js) using `handle`.
// The numbers below are a snapshot for the home page tile and the chat bot only.
export const coding = {
  handle: 'sumit09',
  profile: 'https://codolio.com/profile/sumit09',
  totals: [
    ['630', 'questions solved'],
    ['218', 'active days'],
    ['81', 'day max streak'],
    ['916', 'Codeforces rating'],
  ],
  globalRank: '11,721',
  platforms: [
    { name: 'LeetCode', solved: 274, url: 'https://leetcode.com/u/sumitranjan2207/' },
    { name: 'CodeChef', solved: 165, url: 'https://www.codechef.com/users/sumitranjan220' },
    { name: 'Code360', solved: 118, url: 'https://www.naukri.com/code360/profile/eedb9b6f-350c-437e-9ecd-993b0d05187c' },
    { name: 'GeeksforGeeks', solved: 55, url: 'https://www.geeksforgeeks.org/user/sumitranfclr/' },
    { name: 'Codeforces', solved: 18, url: 'https://codeforces.com/profile/sumitranjan2207' },
  ],
  difficulty: [
    ['Easy', 191],
    ['Medium', 186],
    ['Hard', 56],
  ],
  topics: [
    ['Arrays', 178],
    ['HashMap & Set', 56],
    ['Strings', 44],
    ['Sorting', 44],
    ['Math', 42],
    ['Dynamic Programming', 40],
    ['Two Pointers', 35],
    ['Binary Search', 34],
    ['Greedy', 27],
  ],
}
