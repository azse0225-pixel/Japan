"use client";
import { useState } from "react";
export default function reactTest() {
  const [count, setCount] = useState<any>(0);
  function sub() {
    const nextCount = count + 1;
    setCount(nextCount);
    alert(nextCount);
  }
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={sub}>Increment</button>
    </div>
  );
}
