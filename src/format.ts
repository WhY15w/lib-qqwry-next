export type FormatType = "text" | "csv" | "json" | "object";

function csvDecode(str: string): string {
  return str.replace(/^(.*[,"\n].*)$/, (_k: string) => {
    return '"' + _k.replace(/"/g, '""') + '"';
  });
}

function formatCsv(val: (string | number)[]): string {
  return val.map((v) => csvDecode(String(v))).join(",") + "\n";
}

function formatJson(obj: unknown): string {
  return JSON.stringify(obj);
}

function formatText(arr: (string | number)[]): string {
  let ipstr = arr[2] + " - " + arr[3];
  ipstr += ipstr.length < 33 ? new Array(34 - ipstr.length).join(" ") : "";
  return ipstr + " " + arr[4] + " " + arr[5] + "\n";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormatFn = (val: any) => string | any;

export default function getFormatFn(format?: FormatType): FormatFn {
  switch (format) {
    case "object":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (val: any) => val;
    case "csv":
      return formatCsv;
    case "json":
      return formatJson;
    case "text":
    default:
      return formatText;
  }
}
