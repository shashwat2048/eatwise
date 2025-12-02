"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { isBot } from "@/lib/utils";

export default function StripeLoader() {
    const [shouldLoad, setShouldLoad] = useState(false);

    useEffect(() => {
        // Check if it's a bot on the client side
        // This ensures we don't load the script for crawlers, preventing "blocked by robots.txt" errors
        if (typeof navigator !== "undefined" && !isBot(navigator.userAgent)) {
            setShouldLoad(true);
        }
    }, []);

    if (!shouldLoad) return null;

    return <Script async src="https://js.stripe.com/v3/buy-button.js" />;
}
