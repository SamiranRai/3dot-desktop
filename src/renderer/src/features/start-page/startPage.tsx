// import './StartPage.css';

interface Favourite {
  name: string;
  url: string;
  icon?: string;
}

const favourites: Favourite[] = [
  {
    name: 'Apple',
    url: 'https://apple.com',
    icon: '',
  },
  {
    name: 'Google',
    url: 'https://google.com',
    icon: 'G',
  },
  {
    name: 'YouTube',
    url: 'https://youtube.com',
    icon: '▶',
  },
  {
    name: 'GitHub',
    url: 'https://github.com',
    icon: 'GH',
  },
];

const suggestions = [
  {
    title: 'YouTube',
    url: 'https://youtube.com',
  },
  {
    title: 'ChatGPT',
    url: 'https://chatgpt.com',
  },
  {
    title: 'GitHub',
    url: 'https://github.com',
  },
];

const StartPage = () => {
  const handleNavigate = (url: string) => {
    window.browser.navigate(url);
  };

  return (
    <main className="start-page">
      <section className="start-page-section">
        <h2 className="start-page-section-title">Favourites</h2>

        <div className="favourites-grid">
          {favourites.map((site) => (
            <button
              key={site.url}
              className="favourite"
              onClick={() => handleNavigate(site.url)}
            >
              <div className="favourite-icon">{site.icon}</div>

              <span className="favourite-name">{site.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="start-page-section">
        <h2 className="start-page-section-title">Suggestions</h2>

        <div className="suggestions-grid">
          {suggestions.map((site) => (
            <button
              key={site.url}
              className="suggestion"
              onClick={() => handleNavigate(site.url)}
            >
              <div className="suggestion-preview">{site.title}</div>

              <div className="suggestion-info">
                <strong>{site.title}</strong>
                <span>{site.url.replace('https://', '')}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="start-page-section">
        <h2 className="start-page-section-title">Privacy Report</h2>

        <div className="privacy-report">
          <strong>Your browsing privacy</strong>

          <p>Trackers prevented from profiling you will appear here.</p>
        </div>
      </section>
    </main>
  );
};

export default StartPage;
