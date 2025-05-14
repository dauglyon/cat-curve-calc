/**
 * Solves for catenary curve parameters given two points and arc length
 * Catenary equation: y = a * cosh((x - b) / a) + c
 * 
 * @param points - Two points [[x1, y1], [x2, y2]] the curve must pass through
 * @param s - Arc length of the curve between the two points
 * @returns Object containing catenary parameters {a, b, c} or null if no solution found
 */
export function solveCatenary(
  points: [[number, number], [number, number]], 
  s: number
): { a: number; b: number; c: number } | null {
  const [[x1, y1], [x2, y2]] = points;
  
  // Validate input
  if (s <= 0) throw new Error("Arc length must be positive");
  if (x1 === x2) throw new Error("Points must have different x-coordinates");
  
  // Calculate minimum possible arc length (straight line distance)
  const minArcLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  if (s < minArcLength) {
    throw new Error(`Arc length ${s} is less than minimum possible ${minArcLength}`);
  }
  
  // System of equations:
  // 1) y1 = a * cosh((x1 - b) / a) + c
  // 2) y2 = a * cosh((x2 - b) / a) + c  
  // 3) s = a * (sinh((x2 - b) / a) - sinh((x1 - b) / a))
  
  function equations(params: [number, number, number]): [number, number, number] {
    const [a, b, c] = params;
    
    if (a <= 0) return [Infinity, Infinity, Infinity];
    
    const arg1 = (x1 - b) / a;
    const arg2 = (x2 - b) / a;
    
    const cosh1 = Math.cosh(arg1);
    const cosh2 = Math.cosh(arg2);
    const sinh1 = Math.sinh(arg1);
    const sinh2 = Math.sinh(arg2);
    
    const eq1 = a * cosh1 + c - y1;
    const eq2 = a * cosh2 + c - y2;
    const eq3 = a * (sinh2 - sinh1) - s;
    
    return [eq1, eq2, eq3];
  }
  
  // Jacobian matrix for Newton-Raphson
  function jacobian(params: [number, number, number]): number[][] {
    const [a, b] = params;
    
    if (a <= 0) return [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    
    const arg1 = (x1 - b) / a;
    const arg2 = (x2 - b) / a;
    
    const cosh1 = Math.cosh(arg1);
    const cosh2 = Math.cosh(arg2);
    const sinh1 = Math.sinh(arg1);
    const sinh2 = Math.sinh(arg2);
    
    // Partial derivatives
    const J11 = cosh1 - arg1 * sinh1;  // ∂eq1/∂a
    const J12 = sinh1;                 // ∂eq1/∂b
    const J13 = 1;                     // ∂eq1/∂c
    
    const J21 = cosh2 - arg2 * sinh2;  // ∂eq2/∂a
    const J22 = sinh2;                 // ∂eq2/∂b
    const J23 = 1;                     // ∂eq2/∂c
    
    const J31 = sinh2 - sinh1 - (arg2 * cosh2 - arg1 * cosh1); // ∂eq3/∂a
    const J32 = cosh1 - cosh2;         // ∂eq3/∂b
    const J33 = 0;                     // ∂eq3/∂c
    
    return [
      [J11, J12, J13],
      [J21, J22, J23],
      [J31, J32, J33]
    ];
  }
  
  // Solve 3x3 linear system using Gaussian elimination
  function solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = 3;
    const augmented = A.map((row, i) => [...row, b[i]]);
    
    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      
      // Make all rows below this one 0 in current column
      for (let k = i + 1; k < n; k++) {
        const factor = augmented[k][i] / augmented[i][i];
        for (let j = i; j <= n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
    
    // Back substitution
    const solution = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      solution[i] = augmented[i][n];
      for (let j = i + 1; j < n; j++) {
        solution[i] -= augmented[i][j] * solution[j];
      }
      solution[i] /= augmented[i][i];
    }
    
    return solution;
  }
  
  // Newton-Raphson solver
  function newtonRaphson(initialGuess: [number, number, number], maxIter = 100, tolerance = 1e-10): [number, number, number] | null {
    let params = [...initialGuess] as [number, number, number];
    
    for (let iter = 0; iter < maxIter; iter++) {
      const f = equations(params);
      const J = jacobian(params);
      
      // Check convergence
      const residual = Math.sqrt(f[0] * f[0] + f[1] * f[1] + f[2] * f[2]);
      if (residual < tolerance) {
        return params;
      }
      
      // Solve J * delta = -f
      try {
        const delta = solveLinearSystem(J, [-f[0], -f[1], -f[2]]);
        
        // Update with line search for stability
        let stepSize = 1.0;
        let newParams: [number, number, number];
        
        for (let ls = 0; ls < 10; ls++) {
          newParams = [
            params[0] + stepSize * delta[0],
            params[1] + stepSize * delta[1],
            params[2] + stepSize * delta[2]
          ];
          
          // Ensure a > 0
          if (newParams[0] > 0) {
            const newResidual = equations(newParams);
            const newNorm = Math.sqrt(newResidual[0] ** 2 + newResidual[1] ** 2 + newResidual[2] ** 2);
            
            if (newNorm < residual || ls === 9) {
              params = newParams;
              break;
            }
          }
          stepSize *= 0.5;
        }
        
      } catch {
        return null;
      }
    }
    
    return null;
  }
  
  // Generate multiple initial guesses to increase chances of convergence
  const initialGuesses: [number, number, number][] = [];
  
  // Guess 1: Symmetric catenary with b at midpoint
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  
  // Estimate 'a' from arc length constraint
  let estimatedA = s / (2 * Math.sinh(dx / (2 * s / Math.PI)));
  if (!isFinite(estimatedA) || estimatedA <= 0) {
    estimatedA = s / 4;
  }
  
  initialGuesses.push([estimatedA, midX, midY - estimatedA]);
  
  // Guess 2: Try different values of a
  for (const aFactor of [0.5, 1.5, 2.0, 3.0]) {
    const a = estimatedA * aFactor;
    initialGuesses.push([a, midX, midY - a]);
    initialGuesses.push([a, midX + dx * 0.1, midY - a]);
    initialGuesses.push([a, midX - dx * 0.1, midY - a]);
  }
  
  // Try to solve with each initial guess
  for (const guess of initialGuesses) {
    const result = newtonRaphson(guess);
    if (result !== null && result[0] > 0) {
      // Verify the solution
      const [eq1, eq2, eq3] = equations(result);
      const error = Math.sqrt(eq1 * eq1 + eq2 * eq2 + eq3 * eq3);
      
      if (error < 1e-6) {
        return {
          a: result[0],
          b: result[1],
          c: result[2]
        };
      }
    }
  }
  
  return null;
}