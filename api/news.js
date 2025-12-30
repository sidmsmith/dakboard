// News API - Fetch news headlines from RSS feed
// Uses RSS feeds (AP News, etc.) - free and no API key required

export default async function (req, res) {
  const { method, query } = req;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // RSS feed URL - can be configured via environment variable or use default
  // AP News no longer provides RSS feeds, so using Reuters as default
  // Alternative options: BBC, NPR, CNN, etc.
  const rssUrl = process.env.NEWS_RSS_URL || 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best';
  
  // Fallback URLs if primary fails (user can override with NEWS_RSS_URL env var)
  const fallbackUrls = [
    'https://feeds.reuters.com/reuters/topNews',
    'https://rss.cnn.com/rss/edition.rss',
    'https://feeds.npr.org/1001/rss.xml'
  ];
  
  console.log('Fetching RSS feed from:', rssUrl);
  
  try {
    // Fetch RSS feed with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    let response;
    try {
      console.log('Attempting to fetch RSS feed...');
      response = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal,
        // Add redirect handling
        redirect: 'follow'
      });
      clearTimeout(timeoutId);
      console.log('Fetch response status:', response.status, response.statusText);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('Fetch error details:', {
        name: fetchError.name,
        message: fetchError.message,
        cause: fetchError.cause,
        stack: fetchError.stack
      });
      
      if (fetchError.name === 'AbortError') {
        throw new Error('RSS feed request timed out after 15 seconds');
      }
      
      // Provide more detailed error message
      let errorMsg = `Failed to fetch RSS feed: ${fetchError.message}`;
      if (fetchError.cause) {
        errorMsg += ` (Cause: ${fetchError.cause.message || fetchError.cause})`;
      }
      if (fetchError.code) {
        errorMsg += ` (Code: ${fetchError.code})`;
      }
      throw new Error(errorMsg);
    }
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('RSS feed HTTP error:', response.status, response.statusText, errorText.substring(0, 200));
      throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
    }
    
    const xmlText = await response.text();
    
    if (!xmlText || xmlText.trim().length === 0) {
      throw new Error('RSS feed returned empty content');
    }
    
    console.log('RSS feed fetched, length:', xmlText.length);
    
    // Parse RSS XML
    const articles = parseRSSFeed(xmlText);
    
    console.log('Parsed articles:', articles.length);
    
    if (!articles || articles.length === 0) {
      console.error('No articles parsed from RSS feed. XML preview:', xmlText.substring(0, 500));
      return res.status(500).json({ 
        error: 'No articles found in RSS feed',
        details: 'RSS feed was fetched but no articles could be parsed'
      });
    }
    
      // Set CORS headers before returning
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      // Return in same format as NewsAPI for compatibility
      return res.json({
        status: 'ok',
        totalResults: articles.length,
        articles: articles
      });
    } catch (error) {
      console.error(`Failed to fetch from ${rssUrl}:`, error.message);
      lastError = error;
      
      // If this was the last URL or it's a configured URL, break and return error
      if (rssUrl === urlsToTry[urlsToTry.length - 1] || process.env.NEWS_RSS_URL) {
        break;
      }
      // Otherwise try next URL
      continue;
    }
  }
  
  // All URLs failed
  console.error('All RSS feed URLs failed. Last error:', lastError);
  
  // Set CORS headers even for errors
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  return res.status(500).json({ 
    error: lastError?.message || 'Failed to fetch news feed from all sources',
    details: lastError?.stack || 'Unknown error'
  });
}

// Parse RSS XML and convert to article format
function parseRSSFeed(xmlText) {
  const articles = [];
  
  try {
    // Check if this looks like valid RSS/XML
    if (!xmlText.includes('<rss') && !xmlText.includes('<feed')) {
      console.warn('RSS feed does not appear to be valid RSS/XML format');
    }
    
    // Extract items using regex (simple parser for RSS)
    // Handle both <item> (RSS) and <entry> (Atom feeds)
    const itemRegex = /<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi;
    let itemMatch;
    let itemCount = 0;
    
    while ((itemMatch = itemRegex.exec(xmlText)) !== null && articles.length < 10) {
      itemCount++;
      const itemContent = itemMatch[1];
      
      // Extract title - try multiple patterns
      let titleMatch = itemContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (!titleMatch) {
        titleMatch = itemContent.match(/<title[^>]*\/>/i);
      }
      const title = titleMatch ? cleanXMLText(titleMatch[1] || titleMatch[0]) : null;
      
      // Extract link - RSS uses <link>, Atom uses <link href="...">
      let linkMatch = itemContent.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      if (!linkMatch) {
        linkMatch = itemContent.match(/<link[^>]+href=["']([^"']+)["']/i);
        if (linkMatch) {
          linkMatch = { 1: linkMatch[1] }; // Normalize to same format
        }
      }
      const url = linkMatch ? cleanXMLText(linkMatch[1]) : null;
      
      // Extract publication date - try pubDate, published, updated
      let pubDateMatch = itemContent.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
                        itemContent.match(/<published[^>]*>([\s\S]*?)<\/published>/i) ||
                        itemContent.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);
      const publishedAt = pubDateMatch ? cleanXMLText(pubDateMatch[1]) : new Date().toISOString();
      
      // Extract description (optional)
      const descMatch = itemContent.match(/<description[^>]*>([\s\S]*?)<\/description>/i) ||
                       itemContent.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) ||
                       itemContent.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
      const description = descMatch ? cleanXMLText(descMatch[1]) : '';
      
      // Extract source - try multiple patterns
      let sourceName = 'AP News';
      const sourceMatch = itemContent.match(/<source[^>]*>([\s\S]*?)<\/source>/i) ||
                         itemContent.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i) ||
                         itemContent.match(/<author[^>]*>([\s\S]*?)<\/author>/i);
      if (sourceMatch) {
        const sourceText = cleanXMLText(sourceMatch[1]);
        // Try to extract name from author tag
        const nameMatch = sourceText.match(/<name[^>]*>([\s\S]*?)<\/name>/i);
        sourceName = nameMatch ? cleanXMLText(nameMatch[1]) : sourceText || 'AP News';
      }
      
      // Only add if we have a title and URL
      if (title && url && title !== 'Untitled') {
        articles.push({
          title: title,
          url: url,
          description: description,
          publishedAt: publishedAt,
          source: {
            name: sourceName
          }
        });
      } else {
        console.warn(`Skipping item ${itemCount}: missing title or URL`, { title: !!title, url: !!url });
      }
    }
    
    console.log(`Parsed ${itemCount} items, extracted ${articles.length} articles`);
  } catch (error) {
    console.error('Error parsing RSS feed:', error);
    console.error('Error stack:', error.stack);
    throw new Error(`Failed to parse RSS feed: ${error.message}`);
  }
  
  return articles;
}

// Clean XML text - remove CDATA, decode entities, trim whitespace
function cleanXMLText(text) {
  if (!text) return '';
  
  // Remove CDATA wrapper if present
  text = text.replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1');
  
  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  // Decode numeric entities
  text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  text = text.replace(/&#x([a-f\d]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  // Trim whitespace and newlines
  text = text.trim().replace(/\s+/g, ' ');
  
  return text;
}

