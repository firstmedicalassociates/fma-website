"use client";

import Script from "next/script";

const EMITRR_WEBCHAT_ID = "5c737ff6-8cdb-4c21-89b7-e38adce4f442";
const GOOGLE_ANALYTICS_ID = "G-2FEBLJP9NJ";

function initializeEmitrrWidget() {
  if (
    window.__fmaEmitrrWidgetInitialized ||
    typeof window.EmitrrWidget?.initV2 !== "function"
  ) {
    return;
  }

  window.EmitrrWidget.initV2({
    webchatId: EMITRR_WEBCHAT_ID,
  });
  window.__fmaEmitrrWidgetInitialized = true;
}

export default function ThirdPartyScripts() {
  return (
    <>
      <Script
        id="google-analytics-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-config" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GOOGLE_ANALYTICS_ID}');
        `}
      </Script>
      <Script
        id="emitrr-widget-loader"
        src="https://widget.emitrr.com/v1.0.0/emitrr-widget.js"
        strategy="afterInteractive"
        onReady={initializeEmitrrWidget}
      />
      <Script
        id="rlets-campaign-tracking"
        src="https://cdn.rlets.com/capture_static/mms/mms.js"
        strategy="afterInteractive"
      />
    </>
  );
}
