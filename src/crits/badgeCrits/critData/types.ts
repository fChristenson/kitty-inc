// what a featured crit shows. `image` is the icon's path under public/;
// loadAssets registers it under the crit's own kind, so its ImageName is its kind
export interface FeaturedCritData {
  label: string;
  color: string;
  image: `crits/${string}/${string}.webp`;
  description: string;
}
