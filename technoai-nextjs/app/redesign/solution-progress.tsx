import { SOLUTIONS } from "./data";

export default function SolutionProgress({ index }: { index: number }) {
  return <span className="solution-progress" aria-hidden="true">
    {SOLUTIONS.map((solution, i) => <i key={solution.slug} data-current={i === index || undefined} />)}
  </span>;
}
