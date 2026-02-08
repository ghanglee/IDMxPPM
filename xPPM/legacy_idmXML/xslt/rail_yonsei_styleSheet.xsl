<?xml version="1.0" encoding="UTF-8"?>

<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
exclude-result-prefixes="bpmn">

    <xsl:key name="findBPMN" match="document('Diagram\Diagram(1).bpmn')/bpmn:definitions/bpmn:process/bpmn:dataObjectReference" use="@id"/>
    <xsl:key name="findErByGuid" match="idm/er/subEr/er/specId" use="@guid"/>
    <xsl:key name="findErByGuid2" match="idm/er/subEr/er" use="specId/@guid"/>

    <xsl:output method="html"/>



    <xsl:template match="/">    

        <link rel="stylesheet" type="text/css" href="xml_styleSheet2.css"/>
       
        <html>   
            <style> 
                
                @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300&amp;display=swap');
                
                .cover {
                    width: 794px;
                    height: auto;
                    padding-top: 96px;
                    margin-left: auto;
                    margin-right: auto;
                    background-color: white;
                }

                .page {
                    width: 794px;
                    height: auto;             
                    margin-left: auto;
                    margin-right: auto;
                    background-color: white;
                }
                

                <!--Full Title-->
                h1 {                
                    margin-top: 192px;
                    font-family:Tahoma;
                    text-align: left;
                    font-size: 25.5pt;   
                    font-weight: normal;        
                    }
                
                <!--IDM code-->   

                h2 {          
                    font-family:Tahoma;  
                    text-align: left;
                    font-size: 12.5pt;     
                    font-weight: normal;         
                    }

                <!--Component Title-->   

                h3 {          
                    font-family:'Calibri';    
                    text-align: left;
                    font-size: 19pt;   
                    }

                <!--ER_IU Title-->   

                h4 {          
                   
                    font-weight: normal;
                    font-style: italic; bold;
                    text-align: left;
                    font-size: 12pt;                 
                    }
                    

                .basicInfo .additionalInfo 
                    {
                        width: 100%;                    
                        text-align: left;
                        background-color: gainsboro;
                        border:1px solid;
                        border-color:black;    
                        border-collapse: collapse;   
                        background-color: #ECECEC;              
                    }

                .basicInfo th, .additionalInfo th {
                    font-family:Tahoma; 
                    text-align: left;
                    font-size: 9.5pt;
                    width: 110px;
                    padding: 5px;
                    font-weight: normal;  
                    border:1px solid;
                    border-color:black; 
                    border-collapse: collapse;  
                    background-color: #ECECEC;    
                }

                .basicInfo td {
                    font-family:Tahoma;
                    text-align: left;
                    font-size: 9.5pt;
                    padding-left: 10px;
                    border:1px solid;
                    border-color:black; 
                    border-collapse: collapse;   
                    background-color: #ECECEC;      
                }

                .additionalInfo td {
                    font-family:Tahoma;
                    text-align: left;
                    font-size: 9.5pt;
                    padding-left: 10px;
                    border:1px solid;
                    border-color:black; 
                    border-collapse: collapse;   
                    background-color: #D3D3D3;     
                }

                hr {
                    margin-top: 96px;
                    margin-bottom: 96px;
                }
                
                
            </style>      

            <body>
                <div class="cover">

                    <!--IDM Metadata-->

                    <h1 id="idmFullTitle"><xsl:value-of select="idm/specId/@fullTitle"/></h1>
                   
                    <h2 id="idmCode"><xsl:value-of select="idm/specId/@idmCode"/></h2>          
                   
                    <table  class="basicInfo" style="margin-top: 75px;">                        
                        <xsl:for-each select="idm">     
                        
                            <tr>
                                <xsl:if test="specId/@shortTitle != ''">
                                    <th>shortTitle</th>
                                    <td><xsl:value-of select="specId/@shortTitle"/></td>
                                </xsl:if>
                            </tr>  

                            <tr>       
                                <th>Status</th>
                                <td>
                                    <xsl:if test="specId/@documentStatus='NP'">
                                            <bool>New Proposal</bool> 
                                    </xsl:if>
                                    <xsl:if test="specId/@documentStatus='WD'">
                                            <bool>Working Draft</bool> 
                                    </xsl:if>
                                    <xsl:if test="specId/@documentStatus='PUB'">
                                            <bool>Publication</bool> 
                                    </xsl:if>
                                    <xsl:if test="specId/@documentStatus='WDRL'">
                                            <bool>Withdrawal</bool> 
                                    </xsl:if>                                  
                                </td>                                                                                         
                            </tr>      
                                                                       
                            <tr>                                
                                <th>Authors</th>                            
                                <td style="text-align:left; margin-left:0px;">
                                    <xsl:for-each select="authoring/author">  
                                    <xsl:value-of select= "@firstName"/>&#160;<xsl:value-of select="@lastName"/>
                                    <xsl:choose style="text-align:left; margin-left:0px;">
                                        <xsl:when test="position() != last()">,&#160;</xsl:when>
                                    </xsl:choose>
                                </xsl:for-each>
                                </td>                                
                            </tr>

                            <tr>
                                <xsl:if test="authoring/committee/@name != ''">
                                    <th>Committee</th>
                                    <td><xsl:value-of select="authoring/committee/@name"/></td>
                                </xsl:if>
                            </tr>
                            
                        </xsl:for-each>                      
                    </table>       
                </div>                

                <!--UC-->

                <div class="page" style="page-break-before: always;">
                   
                    <h3>Use Case</h3>
                    <h2 id="idmCode"><xsl:value-of select="idm/uc/specId/@idmCode"/></h2>
                                       
                    <table  class="basicInfo">                        
                        <xsl:for-each select="idm/uc">     
                        
                            <tr>
                                <xsl:if test="specId/@shortTitle != ''">
                                    <th>shortTitle</th>
                                    <td><xsl:value-of select="specId/@shortTitle"/></td>
                                </xsl:if>
                            </tr>  

                            <tr>       
                                <th>Status</th>
                                <td>
                                    <xsl:if test="specId/@documentStatus='NP'">
                                            <bool>New Proposal</bool> 
                                    </xsl:if>
                                    <xsl:if test="specId/@documentStatus='WD'">
                                            <bool>Working Draft</bool> 
                                    </xsl:if>
                                    <xsl:if test="specId/@documentStatus='PUB'">
                                            <bool>Publication</bool> 
                                    </xsl:if>
                                    <xsl:if test="specId/@documentStatus='WDRL'">
                                            <bool>Withdrawal</bool> 
                                    </xsl:if>                                  
                                </td>                                                                                         
                            </tr>      
                                                                       
                            <tr>                                
                                <th>Authors</th>                            
                                <td style="text-align:left; margin-left:0px;">
                                    <xsl:for-each select="authoring/author">  
                                    <xsl:value-of select= "@firstName"/>&#160;<xsl:value-of select="@lastName"/>
                                    <xsl:choose style="text-align:left; margin-left:0px;">
                                        <xsl:when test="position() != last()">,&#160;</xsl:when>
                                    </xsl:choose>
                                </xsl:for-each>
                                </td>                                
                            </tr>

                            <tr>
                                <xsl:if test="authoring/committee/@name != ''">
                                    <th>Committee</th>
                                    <td><xsl:value-of select="authoring/committee/@name"/></td>
                                </xsl:if>
                            </tr>                           

                        </xsl:for-each>                      
                    </table>  

                    <!--Mandatory Attributes_Paragraph-->  
                    
                    <table class="basicInfo" style="margin-top: 35px;">
                        <xsl:for-each select="idm/uc">
                            <tr> 
                                <th>Summary</th>
                                <td>
                                    <xsl:value-of select="summary/description/content"/><br/>
                                </td>
                            </tr> 
                        </xsl:for-each>    
                    </table>

                    <table class="basicInfo" style="margin-top: 15px;">
                        <xsl:for-each select="idm/uc"> 
                            <tr> 
                                <th>Aim and Scope</th>
                                <td>
                                    <xsl:value-of select="aimAndScope/description/content"/><br/>
                                </td>
                            </tr> 
                        </xsl:for-each>    
                    </table>

                    <!--Optional Attributes_Paragraph-->
                    <xsl:if test="benefits/description != ''">
                        <table class="basicInfo" style="margin-top: 15px;">
                            <xsl:for-each select="idm/uc">                                
                                    <tr>                                                             
                                        <th>Benefits</th>
                                        <td>
                                            <contents><xsl:value-of select="benefits/description/content"/></contents>
                                        </td>                                                                 
                                    </tr>
                                
                            </xsl:for-each>    
                        </table>  
                    </xsl:if>

                    <xsl:if test="limitations/description != ''">  
                        <table class="basicInfo" style="margin-top: 15px;">
                            <xsl:for-each select="idm/uc">                 
                                    <tr>                                 
                                        <th>limitations</th>
                                        <td>
                                            <contents><xsl:value-of select="limitations/description/content"/></contents>
                                        </td>                                                                 
                                    </tr>                                   
                            </xsl:for-each>    
                        </table>
                    </xsl:if> 

                    <xsl:if test="requiredResources/description != ''"> 
                        <table class="basicInfo" style="margin-top: 15px;">
                            <xsl:for-each select="idm/uc">                     
                                <tr>                                 
                                    <th>Required Resources</th>
                                    <td>
                                        <contents><xsl:value-of select="requiredResources/description/content"/></contents>
                                    </td>                
                                </tr>  
                                
                            </xsl:for-each>    
                        </table> 
                    </xsl:if>   
                    
                    <xsl:if test="requiredCompetencies/description != ''"> 
                        <table class="basicInfo" style="margin-top: 15px;">
                            <xsl:for-each select="idm/uc"> 
                                                        
                                    <tr>                                
                                        <th>Required Competencies</th>
                                        <td>
                                            <contents><xsl:value-of select="requiredCompetencies/description/content"/></contents>
                                        </td>                                                                 
                                    </tr>  
                                    
                            </xsl:for-each>    
                        </table>    
                    </xsl:if> 

                    <!--Mandatory Attributes-->  
                    
                    <table class="basicInfo" style="margin-top: 15px;">
                        <xsl:for-each select="idm/uc">                                                                                                
                              
                            <tr>                           
                                <th>Language</th>
                                <td>                                      
                                    <xsl:value-of select="language"/>                                                                           
                                </td>                                                         
                            </tr>  
                                    
                            <tr>           
                                <th>Use</th>
                                <td> 
                                    <xsl:value-of select="useClassification/@name"/>                                   
                                        <xsl:choose>
                                            <xsl:when test="useClassification/classification/@name != 'No classification'">
                                                <bool>&#160;(<xsl:value-of select="useClassification/classification/@name"/>)</bool>        
                                            </xsl:when>
                                        <xsl:otherwise>&#160;</xsl:otherwise>                                 
                                    </xsl:choose>                                                                          
                                </td>                                             
                            </tr>                
                            <!--Optional Attributes-->    
                            <tr>
                                <xsl:if test="region/@value != ''">                              
                                    <th>Region</th>
                                    <td> 
                                        <xsl:value-of select="region/@value"/>
                                                                            
                                            <xsl:choose>
                                            <xsl:when test="region/@type='USR'">
                                                <bool>&#160;(User-Defined)</bool> 
                                            </xsl:when>
                                            <xsl:otherwise>&#160;</xsl:otherwise>                                 
                                        </xsl:choose>                                                                          
                                    </td> 
                                </xsl:if>                                
                            </tr>

                            <tr> 
                                <xsl:if test="scopeKeyword != ''">       
                                    <th>Scope Keywords</th>
                                    <td>
                                        <xsl:for-each select="scopeKeyword">
                                            <xsl:value-of select="."/>
                                            <xsl:choose>
                                                <xsl:when test="position() != last()">,&#160;</xsl:when>
                                            </xsl:choose>
                                        </xsl:for-each>
                                    </td>
                                </xsl:if> 
                            </tr> 

                            <tr> 
                                <xsl:if test="benefitKeyword != ''">  
                                    <th>Benefit Keywords</th>
                                    <td>
                                        <xsl:for-each select="benefitKeyword">
                                            <xsl:value-of select="."/>
                                            <xsl:choose>
                                                <xsl:when test="position() != last()">,&#160;</xsl:when>
                                            </xsl:choose>
                                        </xsl:for-each>                                       
                                    </td> 
                                </xsl:if>                                
                            </tr>  

                            <tr> 
                                <xsl:if test="reference/@fullCitation != ''"> 
                                    <th>Reference</th>                          
                                    <td>
                                        <xsl:for-each select="reference">
                                            <xsl:value-of select="@fullCitation"/>                                     
                                            <xsl:choose>
                                                <xsl:when test="position() != last()">,&#160;</xsl:when>
                                            </xsl:choose>
                                        </xsl:for-each>                                       
                                    </td> 
                                </xsl:if>                                
                            </tr>  

                        </xsl:for-each> 
                    </table>                    
                              
                    <h2 style="margin-top: 25px;">Target Project Phase</h2>
                    
                    <table Class="additionalInfo" style="margin-top: 5px;">                   
                                                        
                        <tr>                                     
                            <th style="font-family:'Calibri';  font-weight:bold;">Target Project Name&#160;</th>
                            <th style="font-family:'Calibri';  font-weight:bold;">Outcome Description&#160;</th>   
                            <th style="font-family:'Calibri';  font-weight:bold;">Information Requirement Description&#160;</th>   
                            <th style="font-family:'Calibri';  font-weight:bold;">Exchange Requirement&#160;</th>                                         
                        </tr>    
                        <xsl:for-each select="idm/uc/standardProjectPhase">    

                        <tr style="background-color: #D3D3D3;"> 
                            
                                <td ><xsl:value-of select="name"/></td>  
                                <td><xsl:value-of select="outcomes/description/content"/></td>       
                                <td><xsl:value-of select="informationRequirements/description/content"/></td>
                            <td>    
                                <xsl:value-of select ="key('findErByGuid', informationRequirements/associatedEr)/@shortTitle"/> 
                               
                            </td>               
                                                                        
                        </tr>
                    </xsl:for-each>
                    </table>

                    <xsl:if test="idm/uc/actor != ''">  

                        <h2 style="margin-top: 25px;">Actor</h2>
                        
                        <table Class="additionalInfo" style="margin-top: 5px;">

                            <tr>                                     
                                <th style="font-family:'Calibri';  font-weight:bold;">Classification&#160;</th>
                                <th style="font-family:'Calibri';  font-weight:bold;">Actor&#160;</th>                                     
                            </tr>     

                            <xsl:for-each select="idm/uc/actor">             
                                <tr>  
                                    <td><xsl:value-of select="classification/@name"/></td>  
                                    <td><xsl:value-of select="@name"/></td>                 
                                </tr>
                            </xsl:for-each>

                        </table>

                    </xsl:if>

                    <xsl:if test="idm/uc/userDefinedProperty != ''">  

                        <h2 style="margin-top: 25px;">User Defined Property</h2>

                        <table Class="additionalInfo" style="margin-top: 25px;">
                            <tr>                                    
                                <th style="font-family:'Calibri'; font-weight:bold;">Name&#160;</th>                            
                                <th style="font-family:'Calibri'; font-weight:bold;">Description&#160;</th>                    
                            </tr>     
                            <xsl:for-each select="idm/uc/userDefinedProperty ">             
                                <tr>   
                                    <td><xsl:value-of select="@name"/></td>  
                                    <td><xsl:value-of select="description/content"/></td>                                        
                                </tr>
                            </xsl:for-each>
                        </table>    
                        
                    </xsl:if>

                    <!--     
                                     
                    <h2>Local Project Phases</h2>

                    <table Class="e_table">

                        <tr>                                     
                            <th>Classification Name&#160;</th>
                            <th>Local Phase Name&#160;</th>  
                            <th>Outcome Description&#160;</th>   
                            <th>Information Requirement Description&#160;</th>   
                            <th>Exchange Requirement&#160;</th>                                              
                        </tr>     

                        <xsl:for-each select="idm/uc/localProjectPhase">             
                            <tr> 
                                <td><xsl:value-of select="classification/@name"/></td>  
                                <td><xsl:value-of select="name"/></td>  
                                <td><xsl:value-of select="outcomes/description/content"/></td>       
                                <td><xsl:value-of select="informationRequirements/description/content"/></td>       
                                <td><xsl:value-of select="informationRequirements/associatedEr"/></td>                                                
                            </tr>
                        </xsl:for-each>

                    </table> 

                    <h2>Business Rule</h2>

                    <table Class="e_table">
                        <tr>                                     
                            <th>Rule ID&#160;</th>
                            <th>Rule Name&#160;</th>  
                            <th>Proposition&#160;</th>   
                            <th>Reference&#160;</th>                    
                        </tr>     
                        <xsl:for-each select="idm/uc/businessRule">             
                            <tr> 
                                <td><xsl:value-of select="@id"/></td>  
                                <td><xsl:value-of select="@name"/></td>  
                                <td><xsl:value-of select="proposition/description/content"/></td>       
                                <td><xsl:value-of select="reference/@fullCitation"/></td>       
                            </tr>
                        </xsl:for-each>
                    </table>  

                    <h2>Construction Entity</h2>

                    <table Class="n_table">
                        <xsl:for-each select="idm/uc">                     
                            <tr>                                
                                <th>Use Classicaiton:&#160;</th>
                                <td><xsl:value-of select="constructionEntityClassification/classification/@name"/></td>                                
                                <th>&#160;&#160;Use:&#160;</th>
                                <td><xsl:value-of select="constructionEntityClassification/@name"/></td>                                
                            </tr>
                        </xsl:for-each>
                    </table>

                    -->

                </div>               


                <xsl:if test="idm/businessContextMap != ''">  

                    <div class="page" style="page-break-before: always;">
                    
                        <h3>Business Context Map</h3>

                        <h2 id="idmCode"><xsl:value-of select="idm/businessContextMap/specId/@idmCode"/></h2>
                                        
                        <table  class="basicInfo">                        
                                <xsl:for-each select="idm/businessContextMap">     
                                
                                    <tr>
                                        <xsl:if test="specId/@shortTitle != ''">
                                            <th>shortTitle</th>
                                            <td><xsl:value-of select="specId/@shortTitle"/></td>
                                        </xsl:if>
                                    </tr>  

                                    <tr>       
                                        <th>Status</th>
                                        <td>
                                            <xsl:if test="specId/@documentStatus='NP'">
                                                    <bool>New Proposal</bool> 
                                            </xsl:if>
                                            <xsl:if test="specId/@documentStatus='WD'">
                                                    <bool>Working Draft</bool> 
                                            </xsl:if>
                                            <xsl:if test="specId/@documentStatus='PUB'">
                                                    <bool>Publication</bool> 
                                            </xsl:if>
                                            <xsl:if test="specId/@documentStatus='WDRL'">
                                                    <bool>Withdrawal</bool> 
                                            </xsl:if>                                  
                                        </td>                                                                                         
                                    </tr>      
                                                                            
                                    <tr>                                
                                        <th>Authors</th>                            
                                        <td style="text-align:left; margin-left:0px;">
                                            <xsl:for-each select="authoring/author">  
                                            <xsl:value-of select= "@firstName"/>&#160;<xsl:value-of select="@lastName"/>
                                            <xsl:choose style="text-align:left; margin-left:0px;">
                                                <xsl:when test="position() != last()">,&#160;</xsl:when>
                                            </xsl:choose>
                                        </xsl:for-each>
                                        </td>                                
                                    </tr>

                                    <tr>
                                        <xsl:if test="authoring/committee/@name != ''">
                                            <th>Committee</th>
                                            <td><xsl:value-of select="authoring/committee/@name"/></td>
                                        </xsl:if>
                                    </tr>                                 
                                </xsl:for-each>                      
                            </table>  
                        
                        <xsl:if test="idm/businessContextMap/pm/diagram/@id !=''">

                            <h2 style="margin-top: 35px;">PM Diagram</h2> 
                        
                            <img style="float: left; width: 100%; height: 250px; margin-bottom:96px"  src="Diagram\Diagram(1).png"/>
                        
                        </xsl:if>

                        <h2 style="margin-top: 0px;">Data Object</h2>                        

                        <table  class="basicInfo" style="margin-top: 5px;"> 
                            <tr>          
                                <th>Data Object</th>                      
                                <th>Exchange Requirement</th>
                                <th>Description</th>
                            </tr>  

                            <xsl:for-each select="idm/businessContextMap/pm/dataObjectAndEr">                        
                                <xsl:variable name="a" select="associatedDataObject" />                                                        
                                    <tr>                                             
                                        <td>            
                                            <xsl:value-of select ="document('..\Diagram\Diagram(1).bpmn')/bpmn:definitions/bpmn:process/bpmn:dataObjectReference[@id=$a]/@name"/>                                     
                                        </td>                                 
                                        <td>
                                            <xsl:value-of select ="key('findErByGuid',associatedEr)/@shortTitle"/> 
                                        </td>
                                        <td>
                                            <xsl:value-of select ="key('findErByGuid2',associatedEr)/description/content"/> 
                                        </td>                          
                                    </tr>                                                                                  
                            </xsl:for-each>
                        </table>                                                         
                                            
                    </div>  
                
                </xsl:if>

                <!--ER-->

                <xsl:if test="idm/er != ''">   
                                    
                <div class="page" style="page-break-before: always;">

                    <h3>Exchange requirement</h3>

                    <h2 id="idmCode"><xsl:value-of select="idm/er/specId/@idmCode"/></h2>
                                       
                    <table  class="basicInfo">                        
                        <xsl:for-each select="idm/er">     
                        
                            <tr>
                                <xsl:if test="specId/@shortTitle != ''">
                                    <th>shortTitle</th>
                                    <td><xsl:value-of select="specId/@shortTitle"/></td>
                                </xsl:if>
                            </tr>  

                            <tr>       
                                <th>Status</th>
                                <td>
                                    <xsl:if test="specId/@documentStatus='NP'">
                                            <bool>New Proposal</bool> 
                                    </xsl:if>
                                    <xsl:if test="specId/@documentStatus='WD'">
                                            <bool>Working Draft</bool> 
                                    </xsl:if>
                                    <xsl:if test="specId/@documentStatus='PUB'">
                                            <bool>Publication</bool> 
                                    </xsl:if>
                                    <xsl:if test="specId/@documentStatus='WDRL'">
                                            <bool>Withdrawal</bool> 
                                    </xsl:if>                                  
                                </td>                                                                                         
                            </tr>      
                                                                       
                            <tr>                                
                                <th>Authors</th>                            
                                <td style="text-align:left; margin-left:0px;">
                                    <xsl:for-each select="authoring/author">  
                                    <xsl:value-of select= "@firstName"/>&#160;<xsl:value-of select="@lastName"/>
                                    <xsl:choose style="text-align:left; margin-left:0px;">
                                        <xsl:when test="position() != last()">,&#160;</xsl:when>
                                    </xsl:choose>
                                </xsl:for-each>
                                </td>                                
                            </tr>

                            <tr>
                                <xsl:if test="authoring/committee/@name != ''">
                                    <th>Committee</th>
                                    <td><xsl:value-of select="authoring/committee/@name"/></td>
                                </xsl:if>
                            </tr>                     
                        </xsl:for-each>                      
                    </table>  

                    <table Class="basicInfo" style="margin-top: 25px; margin-bottom: 40px;"> 
                        <xsl:if test="idm/er/description/content != ''">        
                            <tr>                                
                                <th>Description</th>
                                <td><xsl:value-of select="idm/er/description/content"/></td>                               
                            </tr>       
                        </xsl:if>                   
                    </table>  


                    <!-- ER_Information Unit 
                
                    <table Class="additionalInfo" style="margin-top: 25px;"> 
                        
                        <xsl:for-each select="idm/er"> 

                            <tr style="background-color: #FFFFFF;">
                                <th style ="font-weight:bold; text-align:center;" colspan="9"><bool style ="text-transform:capitalize;"><xsl:value-of select="specId/@shortTitle" /></bool></th>
                            </tr>          
                            
                            <xsl:choose>                        
                            
                            <xsl:when test="informationUnit/@name != ''">  

                                <tr>
                                    <th colspan="2" style= "font-weight:bold;">Element Name</th>
                                    <th colspan="4" style= "font-weight:bold;">Definition</th>
                                    <th style= "font-weight:bold;">Required</th>
                                    <th style= "font-weight:bold;">Data Type</th>                               
                                    <th style= "font-weight:bold;">Example</th>    
                                </tr>

                                <xsl:for-each select="informationUnit">  

                                    <tr>                                    
                                        <td colspan="2"><xsl:value-of select="@name"/></td>
                                        <td colspan="4"><xsl:value-of select="@definition" disable-output-escaping="yes"/></td>
                                        <td style ="text-align: justify;">
                                            <xsl:if test="@isMandatory='true'">
                                                    <bool style ="text-align: center;" >O</bool> 
                                            </xsl:if>
                                            <xsl:if test="@isMandatory='false'">
                                                    <bool style ="text-align: center;">X</bool> 
                                            </xsl:if>
                                        </td>
                                        <td><xsl:value-of select="@dataType"/></td>   
                                        <td><xsl:value-of select="examples/description/content"/></td>                                      
                                    </tr>

                                    <xsl:if test="subInformationUnit/informationUnit/@name != ''">                                                                              
                                        <xsl:for-each select="subInformationUnit/informationUnit">                                
                                            <tr>  
                                                <td style="width:20px;">&#8627;</td>            
                                                <td ><xsl:value-of select="@name"/></td>
                                                <td colspan="4"><xsl:value-of select="@definition" disable-output-escaping="yes"/></td>
                                                <td style ="text-align: justify;">
                                                    <xsl:if test="@isMandatory='true'">
                                                            <bool style ="text-align: center;" >O</bool> 
                                                    </xsl:if>
                                                    <xsl:if test="@isMandatory='false'">
                                                            <bool style ="text-align: center;">X</bool> 
                                                    </xsl:if>
                                                </td> 
                                                <td><xsl:value-of select="@dataType"/></td>   
                                                <td><xsl:value-of select="examples/description/content"/></td>                                               
                                            </tr>

                                            <xsl:for-each select="subInformationUnit/informationUnit"> 
                                                <tr>  
                                                    <td style="width:20px;">&#8627;</td>            
                                                    <td ><xsl:value-of select="@name"/></td>
                                                    <td colspan="4"><xsl:value-of select="@definition" disable-output-escaping="yes"/></td>
                                                    <td style ="text-align: justify;">
                                                        <xsl:if test="@isMandatory='true'">
                                                                <bool style ="text-align: center;" >O</bool> 
                                                        </xsl:if>
                                                        <xsl:if test="@isMandatory='false'">
                                                                <bool style ="text-align: center;">X</bool> 
                                                        </xsl:if>
                                                    </td> 
                                                    <td><xsl:value-of select="@dataType"/></td>  
                                                    <td><xsl:value-of select="examples/description/content"/></td>                                                
                                                </tr>
                                            </xsl:for-each>                                    
                                        </xsl:for-each>                                        
                                    </xsl:if>
                                
                                </xsl:for-each>
                                
                            </xsl:when>                            

                            <xsl:otherwise><tr><td style="text-align:left; font-style:italic; background-color: #D3D3D3;" colspan="9">No Information Unit</td></tr></xsl:otherwise>
                            
                            </xsl:choose> 
                    
                        </xsl:for-each>    
                    </table>          

                -->
             


                   
                    <!-- SubER_Information Unit --> 
                    <xsl:for-each select="idm/er/subEr/er">      
                        <table Class="additionalInfo" style="margin-top: 15px;">                                                                            

                            <tr >
                                <th style ="font-family:'Calibri'; text-align:center;" colspan="9">sub_<bool style ="text-transform:capitalize;"><xsl:value-of select="specId/@shortTitle" /></bool></th>
                            </tr>                        
                            
                            <tr>
                                <th colspan="2" style= "font-family:'Calibri'; font-weight:bold;">Element Name</th>
                                <th colspan="4" style= "font-family:'Calibri';font-weight:bold;">Definition</th>
                                <th style= "font-family:'Calibri';font-weight:bold;">Required</th>
                                <th style= "font-family:'Calibri';font-weight:bold;">Data Type</th>                               
                                <th style= "font-family:'Calibri';font-weight:bold;">Example</th>    
                            </tr>

                            <xsl:for-each select="informationUnit">  

                                <tr>                                    
                                    <td colspan="2"><xsl:value-of select="@name"/></td>
                                    <td colspan="4"><xsl:value-of select="@definition" disable-output-escaping="yes"/></td>
                                    <td style ="text-align: justify;">
                                        <xsl:if test="@isMandatory='true'">
                                                <bool style ="text-align: center;" >O</bool> 
                                        </xsl:if>
                                        <xsl:if test="@isMandatory='false'">
                                                <bool style ="text-align: center;">X</bool> 
                                        </xsl:if>
                                    </td>
                                    <td><xsl:value-of select="@dataType"/></td>   
                                    <td><xsl:value-of select="examples/description/content"/></td>                                      
                                </tr>

                                <xsl:if test="subInformationUnit/informationUnit/@name != ''">                                                            
                                                                    
                                    <xsl:for-each select="subInformationUnit/informationUnit">
                            
                                        <tr>  
                                            <td style="width:20px;">&#8627;</td>            
                                            <td ><xsl:value-of select="@name"/></td>
                                            <td colspan="4"><xsl:value-of select="@definition" disable-output-escaping="yes"/></td>
                                            <td style ="text-align: justify;">
                                                <xsl:if test="@isMandatory='true'">
                                                        <bool style ="text-align: center;" >O</bool> 
                                                </xsl:if>
                                                <xsl:if test="@isMandatory='false'">
                                                        <bool style ="text-align: center;">X</bool> 
                                                </xsl:if>
                                            </td> 
                                            <td><xsl:value-of select="@dataType"/></td>   
                                            <td><xsl:value-of select="examples/description/content"/></td>                                               
                                        </tr>

                                        <xsl:for-each select="subInformationUnit/informationUnit">   

                                            <tr>  
                                                <td style="width:20px;">&#8627;</td>            
                                                <td style="background-color: #FFFFFF;"><xsl:value-of select="@name"/></td>
                                                <td style="background-color: #C6C6C6;" colspan="4"><xsl:value-of select="@definition" disable-output-escaping="yes"/></td>
                                                <td style ="background-color: #C6C6C6; text-align: justify;">
                                                    <xsl:if test="@isMandatory='true'">
                                                            <bool style ="text-align: center;" >O</bool> 
                                                    </xsl:if>
                                                    <xsl:if test="@isMandatory='false'">
                                                            <bool style ="text-align: center;">X</bool> 
                                                    </xsl:if>
                                                </td> 
                                                <td style="background-color: #C6C6C6;" ><xsl:value-of select="@dataType"/></td>  
                                                <td style="background-color: #C6C6C6;" ><xsl:value-of select="examples/description/content"/></td>                                                
                                            </tr>
                                        </xsl:for-each>
                                
                                    </xsl:for-each>
                                    
                                </xsl:if>
                    
                            </xsl:for-each>

                        </table>
                    
                    </xsl:for-each>
                       
                </div>

            </xsl:if>   
                
            </body>
        </html>
    </xsl:template>
</xsl:stylesheet>