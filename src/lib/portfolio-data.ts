type SeedProject = {
  name: string;
  owner?: string;
  domain?: string;
  lifecycle?: "active" | "paused";
};

type SeedUnit = {
  name: string;
  priority: number;
  projects: SeedProject[];
};

export const PORTFOLIO_SEED: SeedUnit[] = [
  {
    name: "JGGL",
    priority: 1,
    projects: [
      { name: "JGGL App", owner: "Бахридин Щербаков", domain: "jggl.ai" },
      { name: "JGGL Website", owner: "Бахридин Щербаков", domain: "jggl.ai" },
      { name: "JGGL Buddy + devices", owner: "Короленок Алексей", domain: "jggl.ai" },
      { name: "JGGL Drone", owner: "Малукало Максим", domain: "jggl.ai" },
    ],
  },
  {
    name: "IMBA",
    priority: 2,
    projects: [
      { name: "IMBA Label", owner: "Наталия Суворова", domain: "imbamusic.io" },
      { name: "IMBA Platform", owner: "Андрей Манкович" },
    ],
  },
  {
    name: "BCS Arena",
    priority: 3,
    projects: [
      { name: "BCS Arena", owner: "Тимофей Змитрович", domain: "bcsarena.io" },
      { name: "BCS Arena Parser", owner: "Тимофей Змитрович", domain: "bcsarena.io" },
      { name: "BCSports Website", domain: "bcsports.io" },
    ],
  },
  {
    name: "Arteki",
    priority: 4,
    projects: [
      { name: "Arteki Studio", domain: "artekistudio.com" },
      { name: "Teki Platform", owner: "Евгения Светлова" },
      { name: "Teki App", owner: "Евгения Светлова" },
      { name: "Teki Platform Website", owner: "Евгения Светлова" },
    ],
  },
  {
    name: "ProveUp",
    priority: 5,
    projects: [
      { name: "ProveUp App", owner: "Виталий Мурашкин", domain: "proveup.io" },
      { name: "ProveUp Website", owner: "Виталий Мурашкин", domain: "proveup.io" },
      { name: "ProveUp CV", owner: "Виталий Мурашкин", domain: "proveup.io" },
    ],
  },
  {
    name: "Мобильный паблишер",
    priority: 6,
    projects: [{ name: "Мобильный паблишер", owner: "Тимофей Гусев" }],
  },
  {
    name: "BoostyFi",
    priority: 7,
    projects: [{ name: "BoostyFi", owner: "Артемий Юрин", domain: "boostyfi.com" }],
  },
  {
    name: "ATQM",
    priority: 8,
    projects: [{ name: "ATQM", owner: "Артемий Юрин", domain: "boostyfi.com" }],
  },
  {
    name: "Агроэкосистема",
    priority: 9,
    projects: [
      { name: "Агро-экосистема", owner: "Тимофей Гусев" },
      { name: "Агро-дроны", owner: "Малукало Максим" },
    ],
  },
  {
    name: "Atom AI",
    priority: 10,
    projects: [{ name: "Atom AI", owner: "Евгения Светлова" }],
  },
  {
    name: "Nearis",
    priority: 11,
    projects: [{ name: "Nearis", owner: "Фрайман Виталий" }],
  },
  {
    name: "Qlosophy",
    priority: 12,
    projects: [
      { name: "Qlosophy", owner: "Филипп Козлов", domain: "qlosophy.com" },
      { name: "Qlosophy Oracle", owner: "Филипп Козлов", domain: "qlosophy.com" },
    ],
  },
  {
    name: "Neuro Drift",
    priority: 13,
    projects: [{ name: "Neuro Drift", owner: "Константин Никифоров" }],
  },
  {
    name: "Neuro Design",
    priority: 14,
    projects: [{ name: "Neuro Design", domain: "neurodesign.studio" }],
  },
  {
    name: "BiomedSuit",
    priority: 15,
    projects: [{ name: "BiomedSuit", owner: "Фрайман Виталий" }],
  },
  {
    name: "MotoGP Sim",
    priority: 16,
    projects: [{ name: "MotoGP Sim", owner: "Андрей Коростелев" }],
  },
  {
    name: "Atleta",
    priority: 17,
    projects: [{ name: "Atleta", owner: "Артемий Юрин", domain: "atleta.network" }],
  },
  {
    name: "InkVested",
    priority: 18,
    projects: [{ name: "InkVested", owner: "Сушков Дима" }],
  },
  {
    name: "ATOM Store",
    priority: 19,
    projects: [{ name: "ATOM Store", owner: "Александр Середа", domain: "atomapparel.store" }],
  },
  {
    name: "ATOM Ventures",
    priority: 20,
    projects: [{ name: "ATOM Ventures", owner: "Дмитрий Михальчук", domain: "atomventure.holdings" }],
  },
  {
    name: "ATOM Capital",
    priority: 21,
    projects: [{ name: "ATOM Capital", domain: "atomcapital.ae" }],
  },
  {
    name: "ATOM Mining",
    priority: 22,
    projects: [{ name: "ATOM Mining", domain: "atommining.io" }],
  },
  {
    name: "Enigma",
    priority: 23,
    projects: [{ name: "Enigma", owner: "Эрик Даниелян", domain: "enigmadev.software" }],
  },
  {
    name: "Racing Drone",
    priority: 24,
    projects: [{ name: "Racing Drone", owner: "Малукало Максим" }],
  },
  {
    name: "На паузе",
    priority: 99,
    projects: [
      { name: "BuyToon", owner: "Севак Карапетян", domain: "buytoon.io", lifecycle: "paused" },
      { name: "KeyScout", lifecycle: "paused" },
      { name: "Liquid Mining", owner: "Артем Карапетян", domain: "liquidmining.com", lifecycle: "paused" },
      { name: "GPS Tracker", lifecycle: "paused" },
    ],
  },
];

export const PEOPLE_SEED = [
  "Бахридин Щербаков",
  "Короленок Алексей",
  "Малукало Максим",
  "Наталия Суворова",
  "Андрей Манкович",
  "Тимофей Змитрович",
  "Евгения Светлова",
  "Виталий Мурашкин",
  "Тимофей Гусев",
  "Артемий Юрин",
  "Фрайман Виталий",
  "Филипп Козлов",
  "Константин Никифоров",
  "Андрей Коростелев",
  "Сушков Дима",
  "Александр Середа",
  "Дмитрий Михальчук",
  "Эрик Даниелян",
  "Севак Карапетян",
  "Артем Карапетян",
];
