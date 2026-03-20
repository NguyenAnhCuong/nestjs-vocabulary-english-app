// src/common/interfaces/index.ts
export interface IUser {
  id: string;
  email: string;
  name: string;
  createdAt?: Date;
}

export interface IPagination {
  current: number;
  pageSize: number;
  pages: number;
  total: number;
}

export interface IPaginatedResult<T> {
  meta: IPagination;
  result: T[];
}
