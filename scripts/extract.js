const fs = require('fs');

const data = `
A4048/A4248/A4348
3,30
1,70
3,10
1,70
1,25
A4049/A4249/A4349
2,80
1,50
2,60
1,50
1,35
A4050/A4250/A4350
10,16
5,58
9,90
5,58
0,47
A4051/A4251/A4351
4,07
2,12
3,82
2,12
0,45
1,07
A4054/A4254/A4354/A4054R
10,16
2,54
9,90
2,54
0,47
0,88
A4055/A4255/A4355
6,61
3,10
6,35
3,10
0,72
A4056/A4256/A4356/A4056R
6,61
2,54
6,35
2,54
0,72
0,88
A4060/A4260/A4360
6,61
3,81
6,35
3,81
0,72
1,52
A4261/A4361
6,61
4,65
6,35
4,65
0,72
0,91
A4062/A4262/A4362
10,16
3,39
9,90
3,39
0,47
1,29
A4063/A4263/A4363/A4063R
10,16
3,81
9,90
3,81
0,47
1,52
A4264/A4364
6,61
7,19
6,35
7,19
0,72
0,47
A4265/A4365
10,16
6,78
9,90
6,78
0,47
1,30
A4266/A4366
10,16
9,30
9,90
9,30
0,47
0,90
A4067/A4267/A4367
20,00
28,85
20,00
28,85
0,50
0,43
A4268/A4368
19,99
14,34
19,99
14,34
0,51
0,51
A4291F
7,87
4,64
7,62
4,64
2,75
0,93
A4291L
14,50
1,70
14,50
1,70
3,25
1,25
A4292
9,33
5,20
7,00
5,20
2,33
1,85
A4293
4,60
4,40
2,97
2,97
2,12
2,36
`;

const lines = data.trim().split('\n');
const items = [];
let current = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.match(/^[A-Z0-9/]+$/)) {
    if (current) items.push(current);
    current = { name: line, numbers: [] };
  } else {
    current.numbers.push(parseFloat(line.replace(',', '.')));
  }
}
if (current) items.push(current);

for (const item of items) {
  let [hPitch, vPitch, width, height, mLeft, mTop] = item.numbers;
  
  if (mTop === undefined) {
    // Top margin missing. Let's calculate it.
    // A4 height is 29.7
    // Let's guess rows based on height
    // rows * vPitch approx 29.7
    const rows = Math.floor(29.7 / vPitch);
    mTop = (29.7 - (rows * vPitch)) / 2;
    // Actually, sometimes the first row doesn't have a gap before it, so rows * vPitch is just the step.
    // Let's refine: rows * height + (rows-1)*(vPitch - height)
    // = rows * vPitch - (vPitch - height)
    // margin top = (29.7 - (rows * vPitch - (vPitch - height))) / 2
  }

  const cols = Math.floor(21.0 / hPitch);
  const rows = Math.floor(29.7 / vPitch);

  const gapH = hPitch - width;
  const gapV = vPitch - height;
  
  console.log({
    id: item.name.split('/')[0].toLowerCase(),
    name: item.name,
    cols,
    rows,
    width,
    height,
    gapH: parseFloat(gapH.toFixed(2)),
    gapV: parseFloat(gapV.toFixed(2)),
    mLeft,
    mTop: parseFloat((mTop).toFixed(2))
  });
}
