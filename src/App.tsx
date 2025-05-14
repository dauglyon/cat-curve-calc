import { useState, useCallback, useEffect } from "react";
import "./App.css";

function App() {
  const [points, setPoints] = useState<[[number, number], [number, number]]>([
    [0, 0],
    [0, 0],
  ]);

  const detectClick = useCallback<React.MouseEventHandler<HTMLDivElement>>(
    (event) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      const { clientX, clientY } = event;
      const pointX = ((clientX - bounds.x) / bounds.width) * 100;
      const pointY = ((clientY - bounds.y) / bounds.width) * 100;
      setPoints((old) => [[pointX, pointY], old[0]]);
    },
    []
  );

  const minLength = cartDist(points);
  const maxLength =
    100 -
    points[0][1] +
    100 -
    points[1][1] +
    Math.abs(points[0][0] - points[1][0]);
  const [length, setLength] = useState<number>((minLength + maxLength) / 2);
  
  useEffect(() => {
    if (length < minLength) {
      setLength(minLength);
    } else if (length > maxLength) {
      setLength(maxLength);
    }
  }, [points]);

  const [cat, setCat] = useState<ReturnType<typeof solveCatenary> | undefined>(
    undefined
  );
  const [calc, setCalc] = useState<[number,number][]>([]);
  
  useEffect(() => {
    const orderedPoints = sortX(points);
    try {
      const cat = solveCatenary(orderedPoints, length)
      setCat(cat);
      const segmentCount = Math.round(minLength);
      const segmentXStep = (orderedPoints[1][0] - orderedPoints[0][0]) / segmentCount;
      const segmentsX = [];
      for (let i = 0; i < segmentCount+1; i++) {
        segmentsX.push(orderedPoints[0][0]+i*segmentXStep)
      }
      if(cat) setCalc(segmentsX.map(x=>{
        return [x, evaluateCatenary(cat,x)]
      }));
    } catch {
      //pass
    }

  }, [points, length, minLength]);

  console.log({points, cat, calc})

  return (
    <>
      <h1>Cat Curve Calc, click two points</h1>
      <div className="field" onClick={detectClick}>
        {points.map(([x, y]) => {
          return (
            <div
              className="point"
              style={{ left: `${x}%`, top: `${y}%` }}
            ></div>
          );
        })}
        {cat?calc.map(([x,y])=>{
          return (
            <div
              className="segment"
              style={{ left: `${x}%`, top: `${y}%` }}
            ></div>
          );
        }):null}
      </div>
      <div className="inputs">
      <span>Point A</span>
        <input
          type="number"
          value={points[0][0]}
          onChange={(e) => setPoints(old => [[parseFloat(e.target.value), old[0][1]], old[1]])}
        />
        <input
          type="number"
          value={points[0][1]}
          onChange={(e) => setPoints(old => [[old[0][0], parseFloat(e.target.value)], old[1]])}
        />
        <br />
        <span>Point B</span>
        <input
          type="number"
          value={points[1][0]}
          onChange={(e) => setPoints(old => [old[0], [parseFloat(e.target.value), old[1][1]]])}
        />
        <input
          type="number"
          value={points[1][1]}
          onChange={(e) => setPoints(old => [old[0], [old[1][0], parseFloat(e.target.value)]])}
        />
        <br />
        <span>Arc Length</span>
        <input type="text" value={length} onChange={(e) => {
            setLength(parseFloat(e.currentTarget.value));
          }}></input>
        <input
          type="range"
          min={minLength}
          max={maxLength}
          value={length}
          step={0.1}
          onChange={(e) => {
            setLength(parseFloat(e.currentTarget.value));
          }}
        ></input>
        <br></br>
        <span>{JSON.stringify(cat)}</span>
      </div>
    </>
  );
}

function solveCatenary(
  points: [[number, number], [number, number]],
  s: number
) {
  const [[x1, y1], [x2, y2]] = points;

  const h = x2 - x1;
  const v = y2 - y1;
  
  // Get catenary parameter 'a'
  const m = Math.sqrt(s * s - v * v) / h;
  let x = Math.acosh(m) + 1;
  let prevx = -1;
  const TOO_SMALL = 1e-6;
  
  // Iterate to find 'a'
  for(let count = 0; count < 100 && Math.abs(x - prevx) > TOO_SMALL; count++) {
      prevx = x;
      x = x - (Math.sinh(x) - m * x) / (Math.cosh(x) - m);
  }
  const a = h / (2 * x);
  
  // Calculate offsets
  const offsetX = x1 - ((a * Math.log((s + v) / (s - v)) - h) * 0.5);
  const offsetY = y1 - (a * Math.cosh((x1 - offsetX) / a));
  
  return {
      a: a,
      b: offsetX,
      c: offsetY
  };
}

const sortX = (p:[[number, number],[number, number]]) =>{
  const sorted:[[number, number],[number, number]] = [...p];
  sorted.sort((a,b)=>a[0]-b[0])
  return sorted
}

const cartDist = (points:[[number, number],[number, number]])=>{
  return Math.sqrt(
    Math.pow(points[0][0] - points[1][0], 2) +
      Math.pow(points[0][1] - points[1][1], 2)
  );
}

function evaluateCatenary(params:NonNullable<ReturnType<typeof solveCatenary>>, x:number) {
  const { a, b, c } = params;
  return a * Math.cosh((x - b) / a) + c;
}

export default App;
