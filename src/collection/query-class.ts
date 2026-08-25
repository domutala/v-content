interface QueryState {
  path?: string;
  order: "ASC" | "DESC";
  limit?: number;
}

export class CollectionQuery {
  state: QueryState = { order: "ASC" };

  path(path: string): this {
    this.state.path = path;
    return this;
  }

  order(direction: "ASC" | "DESC" = "ASC"): this {
    this.state.order = direction;
    return this;
  }

  limit(n: number): this {
    this.state.limit = n;
    return this;
  }
}
