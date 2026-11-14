export function referencePath(
  dates: string[],
  values: { date: string; storage_end_mm: number }[],
  x: (index: number) => number,
  y: (value: number) => number,
): string {
  let contiguous = false;
  const result: string[] = [];
  dates.forEach((date, index) => {
    const point = values.find((value) => value.date === date);
    if (!point || !Number.isFinite(point.storage_end_mm)) {
      contiguous = false;
      return;
    }
    result.push(
      `${contiguous ? "L" : "M"} ${x(index)} ${y(point.storage_end_mm)}`,
    );
    contiguous = true;
  });
  return result.join(" ");
}
