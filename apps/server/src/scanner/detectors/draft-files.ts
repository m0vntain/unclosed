import path from "node:path";
import { signal, type Detector } from "./types.js";
export const draftFiles: Detector = {
  id: "draft-files",
  scan({ file }) {
    const match = path
      .basename(file.relativePath)
      .match(
        /(?:^|[\s._-])(draft|wip|unfinished|todo|temp|temporary|scratch|outline|rough|working-copy|final-v[2-9]\d*|final-final)(?=$|[\s._-])/i,
      );
    return match
      ? [
          signal(
            "draft-files",
            "draft",
            "Draft-like filename",
            `Filename contains "${match[1].toLowerCase()}". This is a weak filename clue.`,
            1,
            [
              {
                relativePath: file.relativePath,
                excerpt: `Filename contains "${match[1].toLowerCase()}"`,
              },
            ],
          ),
        ]
      : [];
  },
};
