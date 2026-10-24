/** Editorial rows show only the material and source returned by the feed. */
export function RaceStoryCard({
  title,
  summary,
  keyMoments = [],
  onMomentClick,
  onFullDebrief,
  sourceUrl,
  sourceOutlet,
}) {
  const href = /^https?:\/\//i.test(sourceUrl?.trim() || "")
    ? sourceUrl.trim()
    : null;
  return (
    <article className="race-story">
      <div className="race-story-outlet">
        {sourceOutlet || "FROM THE PADDOCK"}
      </div>
      <div className="race-story-copy">
        <h3>{title}</h3>
        {summary && <p>{summary}</p>}
        {!!keyMoments.length && (
          <ol className="race-story-moments">
            {keyMoments.map((moment, index) => (
              <li key={index}>
                <span className="font-mono type-tabular">L{moment.lap}</span>
                {onMomentClick ? (
                  <button onClick={() => onMomentClick(moment)}>
                    {moment.description}
                  </button>
                ) : (
                  <span>{moment.description}</span>
                )}
              </li>
            ))}
          </ol>
        )}
        {onFullDebrief && (
          <button className="race-story-action" onClick={onFullDebrief}>
            OPEN THE DEBRIEF +
          </button>
        )}
      </div>
      {href && (
        <a
          className="race-story-link"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Read ${title} at ${sourceOutlet || "the source"}`}
        >
          READ THE REPORT <span aria-hidden="true">↗</span>
        </a>
      )}
    </article>
  );
}
