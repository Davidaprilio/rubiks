
                            
               UP            BACK
                    26  25  24
                    23  22  21
                    20  19  18
RIGHT       17  16  15
            14  13  12
            11  10  9
    8  7  6               LEFT
    5  4  3
    2  1  0
FRONT    
               DOWN


9/3 = 3

[0,1,2]
[0,1,2]
[0,1,2]

movement

pindah corner
0,0 -> 0,2
0,2 -> 2,2
2,2 -> 2,0
2,0 -> 0,0

pindah edge
(first,first+1) <-> (first,last-1) -> (first+1,last) <-> (last-1,last)
(first+1,last) <-> (last-1,last) -> (last,first+1) <-> (last,last-1)
(last,first+1) <-> (last,last-1) -> (first+1,first) <-> (last-1,first)
(first+1,first) <-> (last-1,first) -> (first,first+1) <-> (first,last-1)

Legend:
<-> - sampai