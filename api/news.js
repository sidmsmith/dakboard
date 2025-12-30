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
  const rssUrl = process.env.NEWS_RSS_URL || 'https://hosted.ap.org/lineups/TOPHEADS.rss';
  
  try {
    // Fetch RSS feed
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Dakboard/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.statusText}`);
    }
    
    const xmlText = await response.text();
    
    // Parse RSS XML
    const articles = parseRSSFeed(xmlText);
    
    if (!articles || articles.length === 0) {
      return res.status(500).json({ 
        error: 'No articles found in RSS feed' 
      });
    }
    
    // Return in same format as NewsAPI for compatibility
    return res.json({
      status: 'ok',
      totalResults: articles.length,
      articles: articles
    });
  } catch (error) {
    console.error('RSS feed error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch news feed' 
    });
  }
}

// Parse RSS XML and convert to article format
function parseRSSFeed(xmlText) {
  const articles = [];
  
  try {
    // Extract items using regex (simple parser for RSS)
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let itemMatch;
    
    while ((itemMatch = itemRegex.exec(xmlText)) !== null && articles.length < 10) {
      const itemContent = itemMatch[1];
      
      // Extract title
      const titleMatch = itemContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? cleanXMLText(titleMatch[1]) : 'Untitled';
      
      // Extract link
      const linkMatch = itemContent.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      const url = linkMatch ? cleanXMLText(linkMatch[1]) : '';
      
      // Extract publication date
      const pubDateMatch = itemContent.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
      const publishedAt = pubDateMatch ? cleanXMLText(pubDateMatch[1]) : new Date().toISOString();
      
      // Extract description (optional)
      const descMatch = itemContent.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
      const description = descMatch ? cleanXMLText(descMatch[1]) : '';
      
      // Extract source (could be in <source>, <dc:creator>, or channel title)
      let sourceName = 'AP News';
      const sourceMatch = itemContent.match(/<source[^>]*>([\s\S]*?)<\/source>/i) ||
                         itemContent.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i);
      if (sourceMatch) {
        sourceName = cleanXMLText(sourceMatch[1]);
      }
      
      // Only add if we have a title and URL
      if (title && url) {
        articles.push({
          title: title,
          url: url,
          description: description,
          publishedAt: publishedAt,
          source: {
            name: sourceName
          }
        });
      }
    }
  } catch (error) {
    console.error('Error parsing RSS feed:', error);
    throw new Error('Failed to parse RSS feed');
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

