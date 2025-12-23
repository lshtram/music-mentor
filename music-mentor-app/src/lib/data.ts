import { Album, Artist } from "./types";

// Artists reference - keeping for reference when building real recommendation engine
export const artists: { [key: string]: Artist } = {
  "miles-davis": { id: "miles-davis", name: "Miles Davis", bio: "An American trumpeter, bandleader, and composer. He is among the most influential and acclaimed figures in the history of jazz and 20th-century music." },
  "radiohead": { id: "radiohead", name: "Radiohead", bio: "An English rock band formed in Abingdon, Oxfordshire, in 1985. The band consists of Thom Yorke, Jonny Greenwood, Colin Greenwood, Ed O'Brien, and Philip Selway." },
  "kendrick-lamar": { id: "kendrick-lamar", name: "Kendrick Lamar", bio: "An American rapper, songwriter, and record producer. He is regarded as one of the most influential artists of his generation." },
  "brian-eno": { id: "brian-eno", name: "Brian Eno", bio: "An English musician, composer, record producer, and visual artist known for his pioneering work in ambient music and contributions to rock, pop, and electronic music." },
  "kraftwerk": { id: "kraftwerk", name: "Kraftwerk", bio: "A German band formed in Düsseldorf in 1970 by Ralf Hütter and Florian Schneider. Widely considered innovators and pioneers of electronic music." },
};

// Mock albums removed - recommendations are now fetched from AI in real-time
// based on the user prompt and library history

