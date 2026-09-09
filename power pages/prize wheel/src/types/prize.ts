/** Client-side presentation only -- the actual pick is server-side now (claim-prize),
 * so this is just what a wheel slice needs to render: a name and a color. */
export interface Prize {
  name: string;
  color: string;
}
