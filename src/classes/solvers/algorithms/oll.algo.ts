
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
export const OllFormulas: Record<string, any> = {
    "412402432": { // GAN:01
        solve: ["(R U' U') (R2 F R F') U2 (R' F R F')"]
    },
    "411402433": { // GAN:02
        solve: ["F (R U R' U') F' f (R U R' U') f'"]
    },
    "112402430": { // GAN:03
        solve: ["f (R U R' U') f' U' F (R U R' U') F'"]
    },
    "410402332": { // GAN:04
        solve: ["f (R U R' U') f' U F (R U R' U') F'"]
    },
    "112400400": { // GAN:05
        solve: [
            "(r' U2) (R U R' U) r", 
            "y2 l' U2 L U L' U l",
        ]
    },
    "411411332": { // GAN:06
        solve: [
            "(r U' U') (R' U' R U' r')", 
            "y2 l U2 L' U' L U' l'"
        ]
    },
    "102002033": { // GAN:07
        solve: [
            "(r U R' U) (R U' U' r')", 
            "y2 l U L' U L U2 l'"
        ]
    },
    "011002302": { // GAN:08
        solve: [
            "(r' U' R U') (R' U2 r)", 
            "y2 l' U' L U' L' U2 l"
        ]
    },
    "401002330": { // GAN:09
        solve: ["(R U R' U') (R' F) (R2 U R' U') F'"]
    },
    "110002403": { // GAN:10
        solve: ["(R U R' U) (R' F R F') (R' U' R')"]
    },
    "112400003": { // GAN:11
        solve: ["(r' R2 U R' U) (R' U' R' U) M'"]
    },
    "001400332": { // GAN:12
        solve: ["M' (R' U' R U') (R' U2 R U') M"]
    },
    "110000433": { // GAN:13
        solve: ["f (R U) (R2 U') (R' U R U') f'"]
    },
    "411000330": { // GAN:14
        solve: ["(R' F) (R U R' F' R) (F' U' F')"]
    },
    "112000430": { // GAN:15
        solve: ["(r' U' r) (R' U' R U) (r' U r)"]
    },
    "410000332": { // GAN:16
        solve: ["(r U r') (R U R' U') (r U' r')"]
    },
    "011402430": { // GAN:17
        solve: ["(R U R' U) (R' F R F') U2(R' F R F')"]
    },
    "010402333": { // GAN:18
        solve: ["(r U R' U) (R' U' U' r') (r' U2 r)"]
    },
    "010402432": { // GAN:19
        solve: ["(r' R U) (R U R' U' r) (R2' F R F')"]
    },
    "010402030": { // GAN:20
        solve: ["(r U R' U') M2 U (R U' R' U') M'"]
    },
    "101000303": { // GAN:21
        solve: ["(R U' U) (R' U' R U R' U') (R U' R')"]
    },
    "401000403": { // GAN:22
        solve: ["(R U2' U') (R2' U') (R2 U') (U' R)"]
    },
    "101000000": { // GAN:23
        solve: ["(R2 D') (R U' U' R') (R' U R' U R)"]
    },
    "100000300": { // GAN:24
        solve: ["(r U R' U') (r' F R F')"]
    },
    "400000003": { // GAN:25
        solve: ["F' (r U R' U') (r' F R)"]
    },
    "400000302": { // GAN:26
        solve: [
            "(R U' U') (R' U' R U' R')",
            "y' R' U' R U' R' U2 R' U2 R"
        ]
    },
    "102000003": { // GAN:27
        solve: [
            "(R U R' U) (R U' U' R')",
            "y' R' U2 R U R' U R"
        ]
    },
    "000002030": { // GAN:28
        solve: ["(r U R' U') (r' R U) (R U' R')"]
    },
    "100002330": { // GAN:29
        solve: ["(R U R' U') (R U' R' F' U' F) (R U R')"]
    },
    "010400402": { // GAN:30
        solve: ["f (R U) (R2 U' R' U) (R2 U' R') f'"]
    },
    "011002003": { // GAN:31
        solve: ["R' F R U R' f' R (r' U' r)"]
    },
    "110400300": { // GAN:32
        solve: [
            "(R U) (R' U') (R' U R B R')",
            "S (R U R' U') (R' F R f')"
        ]
    },
    "110000330": { // GAN:33
        solve: ["(R U R' U') (R' F R F')",]
    },
    "412000030": { // GAN:34
        solve: ["(R U R2 U') (R' F) (R U R U' F')"]
    },
    "012400300": { // GAN:35
        solve: ["(R U' U') (R'2 F R F') (R U' U' R')"]
    },
    "012002300": { // GAN:36 x
        solve: ["(R' U' R U') (R' U R U) (l U' R' U')"]
    },
    "002002330": { // GAN:37
        solve: ["F (R U' R' U') (R U R' F')",]
    },
    "100002032": { // GAN:38
        solve: ["(R U R' U) (R U' R' U') (R' F R F')"]
    },
    "410000033": { // GAN:39
        solve: ["(R U R' F' U') (R U2 R')"]
    },
    "011000430": { // GAN:40
        solve: ["(R' F) (R U R' U') F' (U R)"]
    },
    "101002030": { // GAN:41
        solve: ["(R U R' U) (R U' U' R') F (R U R' U') F'"]
    },
    "010002303": { // GAN:42
        solve: ["(R' U' R U') (R' U2 R) F (R U R' U') F'"]
    },
    "012002002": { // GAN:43
        solve: ["(B' U') (R' U R B) ⚌OR f' (L' U' L U) f"]
    },
    "410400400": { // GAN:44
        solve: ["f (R U R' U') f'"]
    },
    "410000430": { // GAN:45
        solve: ["F (R U R' U') F'"]
    },
    "002402002": { // GAN:46
        solve: ["(R' U') (R' F R F') (U R)"]
    },
    "102400332": { // GAN:47
        solve: ["b' (U' r' U R)2 b ⚌OR F' (L' U' L U)2 F"]
    },
    "401002433": { // GAN:48
        solve: ["F (R U R' U')2 F'"]
    },
    "112002302": { // GAN:49
        solve: ["(R B') (R2' F R2 B) (R2' F' R)"]
    },
    "411400403": { // GAN:50
        solve: ["(r' U) (r2 U' r2 U') (r2 U r')"]
    },
    "411000433": { // GAN:51
        solve: ["f (R U R' U')2 f'"]
    },
    "401402403": { // GAN:52
        solve: ["(R' F' U' F U') (R U R' U R)"]
    },
    "111002303": { // GAN:53
        solve: ["(r' U2) (R U R' U) (R U' R' U r)"]
    },
    "101002333": { // GAN:54
        solve: ["(r U' U') (R' U' R U' R' U r')"]
    },
    "111000333": { // GAN:55
        solve: ["(r U' U' R' U') (r' R2 U R' U') (r U' r')"]
    },
    "412000432": { // GAN:56
        solve: [
            "(r U r') (U R U' R')2 (r U' r')",
            "(f R U R' U' F') (R U R' U') (R' F R f')"
        ]
    },
    "010000030": { // GAN:57
        solve: ["(R U R' U') M' (U R U' r')"]
    },
}
