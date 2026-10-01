interface BucketBoardProps {
  activeBucket: number;
  litBucket: number;
  landedBucket?: number;
}

const BUCKETS = [1, 2, 3, 4, 5, 6];

export function BucketBoard({ activeBucket, litBucket, landedBucket }: BucketBoardProps) {
  return (
    <div className="board" aria-label="Plinko bucket lights">
      <div className="peg-field" aria-hidden="true">
        {Array.from({ length: 30 }, (_, index) => <span key={index} />)}
      </div>
      <div className="bucket-row">
        {BUCKETS.map((bucket) => {
          const classes = [
            "bucket",
            activeBucket === bucket ? "bucket-active" : "",
            litBucket === bucket ? "bucket-lit" : "",
            landedBucket === bucket ? "bucket-landed" : "",
          ].filter(Boolean).join(" ");

          return (
            <div className={classes} key={bucket}>
              <span>{bucket}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}