<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"
    doctype-system="about:legacy-compat" />

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <title>Perseus Creative Studio — XML Sitemap</title>
        <style>
          :root {
            --ink: #141414;
            --bone: #f5f2ec;
            --ember: #c4502e;
            --stone: #8a8378;
            --line: rgba(20, 20, 20, 0.1);
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: var(--bone);
            color: var(--ink);
            font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
              Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
          }
          .wrap { max-width: 1100px; margin: 0 auto; padding: 56px 24px 80px; }
          header { border-bottom: 1px solid var(--line); padding-bottom: 28px; }
          .eyebrow {
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 11px;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: var(--ember);
            margin: 0 0 12px;
          }
          h1 {
            font-size: clamp(28px, 5vw, 44px);
            letter-spacing: -0.03em;
            line-height: 1.05;
            margin: 0;
          }
          .meta {
            margin-top: 16px;
            font-size: 14px;
            color: var(--stone);
          }
          .meta strong { color: var(--ink); font-variant-numeric: tabular-nums; }
          .count-pill {
            display: inline-flex;
            align-items: baseline;
            gap: 6px;
            margin-top: 18px;
            padding: 7px 14px;
            border: 1px solid var(--line);
            border-radius: 999px;
            background: #fff;
            font-size: 13px;
          }
          .count-pill b { font-size: 15px; font-variant-numeric: tabular-nums; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 32px;
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 14px;
            overflow: hidden;
            font-size: 14px;
          }
          thead th {
            text-align: left;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 10px;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: var(--stone);
            padding: 14px 18px;
            border-bottom: 1px solid var(--line);
            background: var(--bone);
          }
          tbody td { padding: 13px 18px; border-bottom: 1px solid var(--line); vertical-align: top; }
          tbody tr:last-child td { border-bottom: 0; }
          tbody tr:hover td { background: rgba(196, 80, 46, 0.04); }
          td.num { color: var(--stone); font-variant-numeric: tabular-nums; width: 48px; }
          td.tag { font-variant-numeric: tabular-nums; color: var(--stone); white-space: nowrap; }
          a { color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--ember); word-break: break-all; }
          a:hover { color: var(--ember); }
          /* Top navigation bar */
          .topbar {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 14px 20px;
            padding-bottom: 22px;
            margin-bottom: 30px;
            border-bottom: 1px solid var(--line);
          }
          .crumbs { display: flex; align-items: center; gap: 8px; font-size: 13px; }
          .crumbs a { border-bottom: 0; color: var(--stone); }
          .crumbs a:hover { color: var(--ember); }
          .crumbs .sep { color: var(--line); }
          .crumbs .cur { color: var(--ink); font-weight: 600; }
          .pills { display: flex; flex-wrap: wrap; gap: 8px; }
          .pill {
            border-bottom: 0;
            padding: 6px 13px;
            border: 1px solid var(--line);
            border-radius: 999px;
            background: #fff;
            font-size: 13px;
            color: var(--ink);
            transition: all 0.15s ease;
          }
          .pill:hover { border-color: var(--ember); color: var(--ember); }
          .pill.active {
            background: var(--ink);
            color: var(--bone);
            border-color: var(--ink);
          }
          .prevnext { display: flex; gap: 8px; margin-left: auto; }
          .nav-btn {
            border-bottom: 0;
            padding: 6px 13px;
            border: 1px solid var(--line);
            border-radius: 10px;
            background: #fff;
            font-size: 13px;
            color: var(--ink);
            white-space: nowrap;
          }
          .nav-btn:hover { border-color: var(--ember); color: var(--ember); }
          footer { margin-top: 36px; font-size: 12px; color: var(--stone); }
        </style>
      </head>
      <body>
        <div class="wrap">
          <xsl:call-template name="sitemap-nav" />
          <xsl:apply-templates select="s:sitemapindex" />
          <xsl:apply-templates select="s:urlset" />
          <footer>
            Generated by Perseus Creative Studio · This page is for humans;
            crawlers read the underlying XML.
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>

  <!-- Sitemap index: a table of child sitemaps, with a per-label URL count
       and grand total read from the `section:` / `sitemap-total:` comments. -->
  <xsl:template match="s:sitemapindex">
    <xsl:variable name="total"
      select="normalize-space(substring-after(/comment()[contains(., 'sitemap-total:')], 'sitemap-total:'))" />
    <header>
      <p class="eyebrow">XML Sitemap · Index</p>
      <h1>Sitemap index</h1>
      <p class="meta">This index links every child sitemap on the site.</p>
      <span class="count-pill">
        <b><xsl:value-of select="count(s:sitemap)" /></b> sitemaps
      </span>
      <xsl:if test="$total != ''">
        <span class="count-pill" style="margin-left: 8px;">
          <b><xsl:value-of select="$total" /></b> URLs total
        </span>
      </xsl:if>
    </header>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Sitemap</th>
          <th>Section</th>
          <th>URLs</th>
          <th>Last Modified</th>
        </tr>
      </thead>
      <tbody>
        <xsl:for-each select="s:sitemap">
          <xsl:variable name="meta" select="preceding-sibling::comment()[1]" />
          <tr>
            <td class="num"><xsl:value-of select="position()" /></td>
            <td><a href="{s:loc}"><xsl:value-of select="s:loc" /></a></td>
            <td class="tag">
              <xsl:value-of
                select="normalize-space(substring-before(substring-after($meta, 'section:'), '|'))" />
            </td>
            <td class="tag">
              <xsl:value-of select="normalize-space(substring-after($meta, '|'))" />
            </td>
            <td class="tag"><xsl:value-of select="s:lastmod" /></td>
          </tr>
        </xsl:for-each>
      </tbody>
    </table>
  </xsl:template>

  <!-- URL set: a table of page URLs. The content-type name comes from the
       `sitemap-label:` comment each child sitemap emits; falls back to "URLs". -->
  <xsl:template match="s:urlset">
    <xsl:variable name="rawLabel"
      select="normalize-space(substring-after(/comment()[contains(., 'sitemap-label:')], 'sitemap-label:'))" />
    <xsl:variable name="label">
      <xsl:choose>
        <xsl:when test="$rawLabel != ''"><xsl:value-of select="$rawLabel" /></xsl:when>
        <xsl:otherwise>URLs</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <header>
      <p class="eyebrow">XML Sitemap · <xsl:value-of select="$label" /></p>
      <h1>Sitemap</h1>
      <p class="meta">Canonical, index-worthy URLs in this section.</p>
      <span class="count-pill">
        <b><xsl:value-of select="count(s:url)" /></b>
        <xsl:text> </xsl:text>
        <xsl:value-of select="$label" />
      </span>
    </header>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>URL</th>
          <th>Priority</th>
          <th>Change</th>
          <th>Last Modified</th>
        </tr>
      </thead>
      <tbody>
        <xsl:for-each select="s:url">
          <tr>
            <td class="num"><xsl:value-of select="position()" /></td>
            <td><a href="{s:loc}"><xsl:value-of select="s:loc" /></a></td>
            <td class="tag"><xsl:value-of select="s:priority" /></td>
            <td class="tag"><xsl:value-of select="s:changefreq" /></td>
            <td class="tag"><xsl:value-of select="s:lastmod" /></td>
          </tr>
        </xsl:for-each>
      </tbody>
    </table>
  </xsl:template>
  <!-- Top nav bar (humans only): home + back-to-index breadcrumb, jump-to-
       section pills, and prev/next. Data comes from the nav-* comments each
       route emits; if they're absent the bar simply renders nothing. -->
  <xsl:template name="sitemap-nav">
    <xsl:variable name="home"
      select="normalize-space(substring-after(/comment()[contains(., 'nav-home:')], 'nav-home:'))" />
    <xsl:variable name="index"
      select="normalize-space(substring-after(/comment()[contains(., 'nav-index:')], 'nav-index:'))" />
    <xsl:variable name="current"
      select="normalize-space(substring-after(/comment()[contains(., 'nav-current:')], 'nav-current:'))" />
    <xsl:variable name="prev" select="/comment()[contains(., 'nav-prev:')]" />
    <xsl:variable name="next" select="/comment()[contains(., 'nav-next:')]" />

    <xsl:if test="$home != ''">
      <nav class="topbar">
        <div class="crumbs">
          <a href="{$home}">Home</a>
          <span class="sep">/</span>
          <xsl:choose>
            <xsl:when test="$current = 'Index' or $current = ''">
              <span class="cur">Sitemap index</span>
            </xsl:when>
            <xsl:otherwise>
              <a href="{$index}">Sitemap index</a>
              <span class="sep">/</span>
              <span class="cur"><xsl:value-of select="$current" /></span>
            </xsl:otherwise>
          </xsl:choose>
        </div>

        <div class="pills">
          <xsl:for-each select="/comment()[contains(., 'nav-item:')]">
            <xsl:variable name="il"
              select="normalize-space(substring-before(substring-after(., 'nav-item:'), '|'))" />
            <xsl:variable name="iu" select="normalize-space(substring-after(., '|'))" />
            <a href="{$iu}">
              <xsl:attribute name="class">
                <xsl:choose>
                  <xsl:when test="$il = $current">pill active</xsl:when>
                  <xsl:otherwise>pill</xsl:otherwise>
                </xsl:choose>
              </xsl:attribute>
              <xsl:value-of select="$il" />
            </a>
          </xsl:for-each>
        </div>

        <xsl:if test="$prev or $next">
          <div class="prevnext">
            <xsl:if test="$prev">
              <a class="nav-btn"
                href="{normalize-space(substring-after($prev, '|'))}">
                <xsl:text>← </xsl:text>
                <xsl:value-of
                  select="normalize-space(substring-before(substring-after($prev, 'nav-prev:'), '|'))" />
              </a>
            </xsl:if>
            <xsl:if test="$next">
              <a class="nav-btn"
                href="{normalize-space(substring-after($next, '|'))}">
                <xsl:value-of
                  select="normalize-space(substring-before(substring-after($next, 'nav-next:'), '|'))" />
                <xsl:text> →</xsl:text>
              </a>
            </xsl:if>
          </div>
        </xsl:if>
      </nav>
    </xsl:if>
  </xsl:template>
</xsl:stylesheet>
