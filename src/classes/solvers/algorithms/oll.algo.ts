import type { FaceState } from "../cfop"

/**
 * OLL Formulas
 * this file contains the OLL formulas used in the CFOP method
 * 
 * [key: notation formula]
 * key is a string representing the pattern of the top face stickers, have 9 characters each can be: 0-4 representing possible of top color position
 * 0 = top face             pov: looking from top
 * 1 = back face                __1___
 * 2 = left face               \      \
 * 2 = left face             4 \  0   \ 2
 * 3 = down face               \______\
 * 4 = right face                 3
 * @ref https://cdn.shopify.com/s/files/1/0703/2389/6537/files/Frame_37784.png?v=1750150273
 */
export const OllAlgorithms: Record<string, {
    // optional, state of top face stickers of the cube, used for test and debug
    // if not provided except for test
    cube?: FaceState[], 
    // list of formulas to solve the OLL case, if there are multiple formulas, they are alternative to each other
    solve: string[] 
    tags?: string[]
}> = {
    "412402432": { 
        tags: ["GAN:01"],
        solve: ["(R U' U') (R2 F R F') U2 (R' F R F')"]
    },
    "411402433": { 
        tags: ["GAN:02"],
        solve: ["F (R U R' U') F' f (R U R' U') f'"]
    },
    "112402430": { 
        tags: ["GAN:03"],
        solve: ["f (R U R' U') f' U' F (R U R' U') F'"]
    },
    "410402332": { 
        tags: ["GAN:04"],
        solve: ["f (R U R' U') f' U F (R U R' U') F'"]
    },
    "112400400": { 
        tags: ["GAN:05"],
        solve: [
            "(r' U2) (R U R' U) r", 
            "y2 l' U2 L U L' U l",
        ]
    },
    "411411332": { 
        tags: ["GAN:06"],
        solve: [
            "(r U2) (R' U' R U' r')", 
            "y2 l U2 L' U' L U' l'",
        ]
    },
    "102002033": { 
        tags: ["GAN:07"],
        solve: [
            "(r U R' U) (R U' U' r')", 
            "y2 l U L' U L U2 l'"
        ]
    },
    "011002302": { 
        tags: ["GAN:08"],
        solve: [
            "(r' U' R U') (R' U2 r)", 
            "y2 l' U' L U' L' U2 l"
        ]
    },
    "401002330": { 
        tags: ["GAN:09"],
        solve: ["(R U R' U') (R' F) (R2 U R' U') F'"]
    },
    "110002403": { 
        tags: ["GAN:10"],
        solve: ["(R U R' U) (R' F R F') (R U' U' R')"]
    },
    "112400003": { 
        tags: ["GAN:11"],
        solve: ["(r' R2 U R' U) (R U2 R' U) M'"]
    },
    "001400332": { 
        tags: ["GAN:12"],
        solve: ["M' (R' U' R U') (R' U2 R U') M"]
    },
    "110000433": { 
        tags: ["GAN:13"],
        solve: ["f (R U) (R2 U') (R' U R U') f'"]
    },
    "411000330": { 
        tags: ["GAN:14"],
        solve: ["(R' F) (R U R' F' R) (F U' F')"]
    },
    "112000430": { 
        tags: ["GAN:15"],
        solve: ["(r' U' r) (R' U' R U) (r' U r)"]
    },
    "410000332": { 
        tags: ["GAN:16"],
        solve: ["(r U r') (R U R' U') (r U' r')"]
    },
    "011402430": { 
        tags: ["GAN:17"],
        solve: ["(R U R' U) (R' F R F') U2 (R' F R F')"]
    },
    "010402333": { 
        tags: ["GAN:18"],
        solve: ["(r U R' U) (R U2 r') (r' U' R U') (R' U2 r)"]
    },
    "010402432": { 
        tags: ["GAN:19"],
        solve: ["(r' R U) (R U R' U' r) (R2 F R F')"]
    },
    "010402030": { 
        tags: ["GAN:20"],
        solve: ["(r U R' U') M2 U (R U' R' U') M'"]
    },
    "101000303": { 
        tags: ["GAN:21"],
        solve: ["(R U' U') (R' U' R U R' U') (R U' R')"]
    },
    "401000403": { 
        tags: ["GAN:22"],
        solve: ["(R U2) (R2 U') (R2 U') (R2 U') (U' R)"]
    },
    "101000000": { 
        tags: ["GAN:23"],
        solve: ["(R2 D') (R U' U' R' D) (R U' U' R)"]
    },
    "100000300": { 
        tags: ["GAN:24"],
        solve: ["(r U R' U') (r' F R F')"]
    },
    "400000003": { 
        tags: ["GAN:25"],
        solve: ["F' (r U R' U') (r' F R)"]
    },
    "400000302": { 
        tags: ["GAN:26"],
        solve: [
            "(R U' U') (R' U' R U' R')",
            "y' R' U' R U' R' U2 R' U2 R"
        ]
    },
    "102000003": { 
        tags: ["GAN:27"],
        cube: [["ogy", "yr", "ryb", "yo",  "y",  "yb", "gyr", "gy", "ybo"]],
        solve: [
            "(R U R' U) (R U' U' R')",
            "y' R' U2 R U R' U R"
        ]
    },
    "000002030": { 
        tags: ["GAN:28"],
        solve: ["(r U R' U') (r' R U) (R U' R')"]
    },
    "100002330": { 
        tags: ["GAN:29"],
        solve: ["(R U R' U') (R U' R' F' U' F) (R U R')"]
    },
    "010400402": { 
        tags: ["GAN:30"],
        solve: ["f (R U) (R2 U' R' U) (R2 U' R') f'"]
    },
    "011002003": { 
        tags: ["GAN:31"],
        solve: ["R' F R U R' U' F2 U F R)"]
    },
    "110400300": { 
        tags: ["GAN:32"],
        solve: [
            "(R U) (B' U') (R' U R B R')",
            "S (R U R' U') (R' F R f')"
        ]
    },
    "110000330": { 
        tags: ["GAN:33"],
        solve: ["(R U R' U') (R' F R F')",]
    },
    "412000030": { 
        tags: ["GAN:34"],
        solve: ["(R U R2 U') (R' F) (R U R U' F')"]
    },
    "012400300": { 
        tags: ["GAN:35"],
        solve: ["(R U' U') (R'2 F R F') (R U' U' R')"]
    },
    "012002300": { 
        tags: ["GAN:36"],
        solve: ["(R' U' R U') (R' U R U) (l U' R' U)"]
    },
    "002002330": { 
        tags: ["GAN:37"],
        solve: ["F (R U' R' U') (R U R' F')",]
    },
    "100002032": { 
        tags: ["GAN:38"],
        solve: ["(R U R' U) (R U' R' U') (R' F R F')"]
    },
    "410000033": { 
        tags: ["GAN:39"],
        solve: ["(R U R' F' U' F) U (R U2 R')"]
    },
    "011000430": { 
        tags: ["GAN:40"],
        solve: ["(R' F) (R U R' U') F' (U R)"]
    },
    "101002030": { 
        tags: ["GAN:41"],
        solve: ["(R U R' U) (R U' U' R') F (R U R' U') F'"]
    },
    "010002303": { 
        tags: ["GAN:42"],
        solve: ["(R' U' R U') (R' U2 R) F (R U R' U') F'"]
    },
    "012002002": { 
        tags: ["GAN:43"],
        solve: [
            "(B' U') (R' U R B)",
            "f' (L' U' L U) f"]
    },
    "410400400": { 
        tags: ["GAN:44"],
        solve: ["f (R U R' U') f'"]
    },
    "410000430": { 
        tags: ["GAN:45"],
        solve: ["F (R U R' U') F'"]
    },
    "002402002": { 
        tags: ["GAN:46"],
        solve: ["(R' U') (R' F R F') (U R)"]
    },
    "102400332": { 
        tags: ["GAN:47"],
        solve: [
            "b' (U' R' U R) (U' R' U R) b",
            "F' (L' U' L U) (L' U' L U) F"
        ]
    },
    "401002433": { 
        tags: ["GAN:48"],
        solve: [
            "F (R U R' U') (R U R' U') F'",
            "F (R U R' U')2 F'"
        ]
    },
    "112002302": { 
        tags: ["GAN:49"],
        solve: ["(R B') (R2 F R2 B) (R2 F' R)"]
    },
    "411400403": { 
        tags: ["GAN:50"],
        solve: [
            "(L' B) (L2 F' L2 B') (L2 F L')",
            "(r' U) (r2 D' r2 D') (r2 D r')", // incorrect in GAN site
        ]
    },
    "411000433": { 
        tags: ["GAN:51"],
        solve: ["f (R U R' U') (R U R' U') f'"]
    },
    "401402403": { 
        tags: ["GAN:52"],
        solve: ["(R' F' U' F U') (R U R' U R)"]
    },
    "111002303": { 
        tags: ["GAN:53"],
        solve: ["(r' U2) (R U R' U') (R U R' U r)"]
    },
    "101002333": { 
        tags: ["GAN:54"],
        solve: ["(r U' U') (R' U' R U) (R' U' R U' r')"]
    },
    "111000333": { 
        tags: ["GAN:55"],
        solve: ["(r U' U' R' U') (r' R2 U R' U') (r U' r')"]
    },
    "412000432": { 
        tags: ["GAN:56"],
        solve: [
            "(r U r') (U R U' R') (U R U' R') (r U' r')",
            "(f R U R' U' F') (R U R' U') (R' F R f')"
        ]
    },
    "010000030": { 
        tags: ["GAN:57"],
        solve: ["(R U R' U') M' (U R U' r')"]
    },
}
