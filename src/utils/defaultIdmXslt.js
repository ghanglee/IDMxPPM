/**
 * Default XSLT stylesheet for transforming idmXML to HTML
 * Used for PDF export with print-friendly styling
 */

export const defaultIdmXslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:idm="https://standards.iso.org/iso/29481/-3/ed-2/en">

  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <!-- Root template -->
  <xsl:template match="/">
    <html>
      <head>
        <meta charset="UTF-8"/>
        <title>
          <xsl:value-of select="//idm:specId/@fullTitle | //specId/@fullTitle"/>
        </title>
        <style>
          @page {
            size: A4;
            margin: 20mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #333;
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
            background: white;
          }

          h1 {
            font-size: 20pt;
            color: #1a1a1a;
            border-bottom: 3px solid #0066cc;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }

          h2 {
            font-size: 14pt;
            color: #0066cc;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
            margin-top: 25px;
            margin-bottom: 15px;
          }

          h3 {
            font-size: 12pt;
            color: #333;
            margin-top: 20px;
            margin-bottom: 10px;
          }

          h4 {
            font-size: 11pt;
            color: #555;
            margin-top: 15px;
            margin-bottom: 8px;
          }

          .header-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 25px;
            font-size: 10pt;
          }

          .header-meta dt {
            font-weight: 600;
            color: #555;
          }

          .header-meta dd {
            margin: 0 0 8px 0;
            color: #333;
          }

          .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }

          .description {
            background: #fafafa;
            padding: 12px;
            border-left: 3px solid #0066cc;
            margin: 10px 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 10pt;
          }

          th, td {
            border: 1px solid #ddd;
            padding: 8px 10px;
            text-align: left;
          }

          th {
            background: #0066cc;
            color: white;
            font-weight: 600;
          }

          tr:nth-child(even) {
            background: #f9f9f9;
          }

          .er-section {
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            margin: 15px 0;
            page-break-inside: avoid;
          }

          .er-title {
            font-size: 13pt;
            color: #0066cc;
            margin: 0 0 10px 0;
            padding-bottom: 8px;
            border-bottom: 1px solid #eee;
          }

          .info-unit {
            background: #f9f9f9;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
          }

          .info-unit-name {
            font-weight: 600;
            color: #333;
          }

          .mandatory {
            color: #cc0000;
            font-weight: 600;
          }

          .optional {
            color: #666;
          }

          .tag {
            display: inline-block;
            background: #e0e0e0;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 9pt;
            margin: 2px;
          }

          .actor-list {
            list-style: none;
            padding: 0;
          }

          .actor-list li {
            padding: 5px 0;
            border-bottom: 1px solid #eee;
          }

          .actor-list li:last-child {
            border-bottom: none;
          }

          .external-mapping {
            font-size: 9pt;
            color: #666;
            margin-top: 5px;
          }

          .external-mapping .basis {
            font-weight: 600;
            color: #0066cc;
          }

          .image-container {
            margin: 10px 0;
            text-align: center;
          }

          .image-container img {
            max-width: 100%;
            max-height: 300px;
            border: 1px solid #ddd;
          }

          .image-caption {
            font-size: 9pt;
            color: #666;
            margin-top: 5px;
          }

          .footer {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 1px solid #ccc;
            font-size: 9pt;
            color: #666;
            text-align: center;
          }

          @media print {
            body {
              padding: 0;
            }

            .er-section {
              page-break-inside: avoid;
            }

            h2 {
              page-break-after: avoid;
            }
          }
        </style>
      </head>
      <body>
        <xsl:apply-templates select="idm:idm | idm"/>
      </body>
    </html>
  </xsl:template>

  <!-- IDM Root -->
  <xsl:template match="idm:idm | idm">
    <h1>
      <xsl:value-of select="idm:specId/@fullTitle | specId/@fullTitle"/>
    </h1>

    <!-- Header Metadata -->
    <div class="header-meta">
      <dl>
        <dt>Short Title</dt>
        <dd><xsl:value-of select="idm:specId/@shortTitle | specId/@shortTitle"/></dd>

        <dt>IDM Code</dt>
        <dd><xsl:value-of select="idm:specId/@idmCode | specId/@idmCode"/></dd>

        <dt>Version</dt>
        <dd><xsl:value-of select="idm:specId/@version | specId/@version"/></dd>

        <dt>Status</dt>
        <dd><xsl:value-of select="idm:specId/@documentStatus | specId/@documentStatus"/></dd>
      </dl>
      <dl>
        <dt>Author</dt>
        <dd>
          <xsl:for-each select="idm:authoring/idm:author | authoring/author">
            <xsl:if test="idm:person | person">
              <xsl:value-of select="idm:person/@firstName | person/@firstName"/>
              <xsl:if test="idm:person/@lastName | person/@lastName">
                <xsl:text> </xsl:text>
                <xsl:value-of select="idm:person/@lastName | person/@lastName"/>
              </xsl:if>
            </xsl:if>
            <xsl:if test="idm:organization | organization">
              <xsl:value-of select="idm:organization/@name | organization/@name"/>
            </xsl:if>
            <xsl:if test="position() != last()"><xsl:text>, </xsl:text></xsl:if>
          </xsl:for-each>
        </dd>

        <dt>Creation Date</dt>
        <dd><xsl:value-of select="substring-before(idm:authoring/idm:changeLog/@changeDateTime | authoring/changeLog/@changeDateTime, 'T')"/></dd>

        <dt>GUID</dt>
        <dd style="font-size: 8pt;"><xsl:value-of select="idm:specId/@guid | specId/@guid"/></dd>
      </dl>
    </div>

    <!-- Use Case -->
    <xsl:apply-templates select="idm:uc | uc"/>

    <!-- Exchange Requirements -->
    <xsl:if test="idm:er | er">
      <h2>Exchange Requirements</h2>
      <xsl:apply-templates select="idm:er | er"/>
    </xsl:if>

    <!-- Footer -->
    <div class="footer">
      Generated from idmXML (ISO 29481-3) by IDMxPPM neo-Seoul
    </div>
  </xsl:template>

  <!-- Use Case Template -->
  <xsl:template match="idm:uc | uc">
    <h2>Use Case</h2>

    <!-- Summary -->
    <xsl:if test="idm:summary | summary">
      <div class="section">
        <h3>Summary</h3>
        <div class="description">
          <xsl:value-of select="idm:summary/idm:description/@title | summary/description/@title"/>
        </div>
      </div>
    </xsl:if>

    <!-- Aim and Scope -->
    <xsl:if test="idm:aimAndScope | aimAndScope">
      <div class="section">
        <h3>Aim and Scope</h3>
        <div class="description">
          <xsl:value-of select="idm:aimAndScope/idm:description/@title | aimAndScope/description/@title"/>
        </div>
      </div>
    </xsl:if>

    <!-- Uses -->
    <xsl:if test="idm:use | use">
      <div class="section">
        <h3>Uses</h3>
        <xsl:for-each select="idm:use | use">
          <span class="tag"><xsl:value-of select="@name"/></span>
        </xsl:for-each>
      </div>
    </xsl:if>

    <!-- Project Stages -->
    <xsl:if test="idm:standardProjectStage | standardProjectStage">
      <div class="section">
        <h3>Project Stages (ISO 22263)</h3>
        <xsl:for-each select="idm:standardProjectStage | standardProjectStage">
          <span class="tag"><xsl:value-of select="idm:name | name"/></span>
        </xsl:for-each>
      </div>
    </xsl:if>

    <!-- Regions -->
    <xsl:if test="idm:region | region">
      <div class="section">
        <h3>Regions</h3>
        <xsl:for-each select="idm:region | region">
          <span class="tag"><xsl:value-of select="@value"/></span>
        </xsl:for-each>
      </div>
    </xsl:if>

    <!-- Actors -->
    <xsl:if test="idm:actor | actor">
      <div class="section">
        <h3>Actors</h3>
        <ul class="actor-list">
          <xsl:for-each select="idm:actor | actor">
            <li>
              <strong><xsl:value-of select="@name"/></strong>
              <xsl:if test="idm:classification | classification">
                <xsl:text> - </xsl:text>
                <xsl:value-of select="idm:classification/@name | classification/@name"/>
              </xsl:if>
            </li>
          </xsl:for-each>
        </ul>
      </div>
    </xsl:if>

    <!-- Benefits -->
    <xsl:if test="idm:benefits | benefits">
      <div class="section">
        <h3>Benefits</h3>
        <div class="description">
          <xsl:value-of select="idm:benefits/idm:description/@title | benefits/description/@title"/>
        </div>
      </div>
    </xsl:if>

    <!-- Limitations -->
    <xsl:if test="idm:limitations | limitations">
      <div class="section">
        <h3>Limitations</h3>
        <div class="description">
          <xsl:value-of select="idm:limitations/idm:description/@title | limitations/description/@title"/>
        </div>
      </div>
    </xsl:if>
  </xsl:template>

  <!-- Exchange Requirement Template -->
  <xsl:template match="idm:er | er">
    <div class="er-section">
      <h3 class="er-title">
        <xsl:value-of select="idm:specId/@shortTitle | specId/@shortTitle"/>
        <xsl:if test="not(idm:specId/@shortTitle | specId/@shortTitle)">
          Exchange Requirement
        </xsl:if>
      </h3>

      <!-- ER Description -->
      <xsl:if test="idm:description | description">
        <div class="description">
          <xsl:value-of select="idm:description/@title | description/@title"/>
        </div>
      </xsl:if>

      <!-- Information Units -->
      <xsl:if test="idm:informationUnit | informationUnit">
        <h4>Information Units</h4>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Data Type</th>
              <th>Required</th>
              <th>Definition</th>
            </tr>
          </thead>
          <tbody>
            <xsl:apply-templates select="idm:informationUnit | informationUnit"/>
          </tbody>
        </table>
      </xsl:if>

      <!-- Sub-ERs (recursive) -->
      <xsl:if test="idm:subEr | subEr">
        <xsl:for-each select="idm:subEr/idm:er | subEr/er">
          <xsl:apply-templates select="."/>
        </xsl:for-each>
      </xsl:if>
    </div>
  </xsl:template>

  <!-- Information Unit Template -->
  <xsl:template match="idm:informationUnit | informationUnit">
    <tr>
      <td>
        <span class="info-unit-name"><xsl:value-of select="@name"/></span>
        <xsl:if test="idm:correspondingExternalElement | correspondingExternalElement">
          <div class="external-mapping">
            <xsl:for-each select="idm:correspondingExternalElement | correspondingExternalElement">
              <span class="basis"><xsl:value-of select="@basis"/></span>
              <xsl:text>: </xsl:text>
              <xsl:value-of select="@name"/>
              <xsl:if test="position() != last()"><xsl:text>, </xsl:text></xsl:if>
            </xsl:for-each>
          </div>
        </xsl:if>
      </td>
      <td><xsl:value-of select="@dataType"/></td>
      <td>
        <xsl:choose>
          <xsl:when test="@isMandatory = 'true'">
            <span class="mandatory">Yes</span>
          </xsl:when>
          <xsl:otherwise>
            <span class="optional">No</span>
          </xsl:otherwise>
        </xsl:choose>
      </td>
      <td><xsl:value-of select="@definition"/></td>
    </tr>
    <!-- Sub Information Units -->
    <xsl:if test="idm:subInformationUnit/idm:informationUnit | subInformationUnit/informationUnit">
      <xsl:apply-templates select="idm:subInformationUnit/idm:informationUnit | subInformationUnit/informationUnit"/>
    </xsl:if>
  </xsl:template>

</xsl:stylesheet>`;

export default defaultIdmXslt;
