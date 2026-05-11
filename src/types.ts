import type { Readable } from "node:stream";

export interface IpInfo {
  int: number;
  ip: string;
  Country: string;
  Area: string;
}

export interface IpScopeInfo {
  begInt: number;
  endInt: number;
  begIP: string;
  endIP: string;
  Country: string;
  Area: string;
}

export interface StreamOptions {
  format?: "text" | "csv" | "json" | "object";
  outHeader?: boolean;
}

export interface IpdbOptions {
  language?: string;
}

export interface CmdApi {
  name: string;
  readBuffer(start: number, length: number): Buffer;
  readUIntLE(start: number, length: number): number;
  getStringByteArray(start: number): number[];
  close(): void;
}

export type CmdFactory = () => CmdApi;

export interface IpdbCmdApi {
  name: string;
  find(addr: string, language: string): string[];
  fields(): string[];
  languages(): string[];
  buildTime(): number;
  close(): void;
}

export type IpdbCmdFactory = () => IpdbCmdApi;

export interface QqwryCallable {
  (ip: string | number): IpInfo;
  (begin: string | number, end: string | number): IpScopeInfo[];
  (
    begin: string | number,
    end: string | number,
    callback: (err: Error | null, data: IpScopeInfo[]) => void,
  ): void;
  searchIP(ip: string | number): IpInfo;
  searchIPScope(begin: string | number, end: string | number): IpScopeInfo[];
  searchIPScope(
    begin: string | number,
    end: string | number,
    callback: (err: Error | null, data: IpScopeInfo[]) => void,
  ): void;
  searchIPScopeStream(
    begin: string | number,
    end: string | number,
    options?: StreamOptions,
  ): Readable;
  speed(): QqwryCallable;
  unSpeed(): QqwryCallable;
}

export interface IpdbCallable {
  (ip?: string | number, language?: string): Record<string, string>;
  searchIP(ip: string | number, language?: string): Record<string, string>;
  fields(): string[];
  languages(): string[];
  buildTime(): number;
  speed(): IpdbCallable;
  unSpeed(): IpdbCallable;
}
