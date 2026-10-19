import React from 'react';

const TradingViewWidget = () => {
  // Use iframe approach for more reliable embedding
  const widgetConfig = {
    autosize: true,
    symbol: "OANDA:XAUUSD",
    interval: "15",
    timezone: "Etc/UTC",
    theme: "dark",
    style: "1",
    locale: "en",
    backgroundColor: "rgba(15, 15, 15, 1)",
    gridColor: "rgba(242, 242, 242, 0.06)",
    allow_symbol_change: true,
    calendar: false,
    details: false,
    hide_side_toolbar: true,
    hide_top_toolbar: false,
    hide_legend: false,
    hide_volume: false,
    hotlist: false,
    save_image: true,
    withdateranges: false,
    watchlist: [],
    compareSymbols: [],
    studies: []
  };

  const configString = encodeURIComponent(JSON.stringify(widgetConfig));
  const iframeSrc = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=OANDA%3AXAUUSD&interval=15&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=0&hideideas=1&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=&utm_medium=widget_new&utm_campaign=chart&utm_term=OANDA%3AXAUUSD`;

  return (
    <div className="w-full h-full flex flex-col">
      <iframe
        id="tradingview_widget"
        src={iframeSrc}
        style={{
          width: '100%',
          height: 'calc(100% - 32px)',
          border: 'none',
          backgroundColor: '#0F0F0F'
        }}
        allowTransparency="true"
        scrolling="no"
        allowFullScreen
        title="TradingView Chart"
      />
      <div 
        className="text-center py-1"
        style={{ fontSize: '13px', lineHeight: '32px', color: '#787B86' }}
      >
        <a 
          href="https://www.tradingview.com/symbols/XAUUSD/?exchange=OANDA" 
          rel="noopener nofollow" 
          target="_blank"
          style={{ color: '#2962FF', textDecoration: 'none' }}
        >
          XAUUSD chart
        </a>
        <span> by TradingView</span>
      </div>
    </div>
  );
};

export default TradingViewWidget;
