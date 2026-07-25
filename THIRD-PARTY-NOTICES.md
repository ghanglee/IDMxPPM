# Third-Party Notices

xPPM neo-Seoul / IDMxPPM (GPL-3.0-or-later, with a Saxon-JS linking exception —
see the NOTICE file) is built with and distributes the following third-party
components. Each is provided under its own license, summarized below. Full
license texts are available in each package's own directory under
`node_modules/<pkg>/` after `npm install`.

## Summary

| Component | Purpose | License |
|---|---|---|
| [Saxon-JS](https://www.saxonica.com/saxon-js/index.xml) (`saxon-js`, `xslt3`) | XSLT 2.0/3.0 processing engine | Proprietary — Saxonica License v1.0 (reproduced in full below) |
| [bpmn-js](https://github.com/bpmn-io/bpmn-js) | BPMN diagram editor | MIT, **with a required bpmn.io watermark clause** |
| [jszip](https://github.com/Stuk/jszip) | ZIP archive read/write | MIT OR GPL-3.0-or-later |
| [react](https://github.com/facebook/react), [react-dom](https://github.com/facebook/react) | UI framework | MIT |
| [uuid](https://github.com/uuidjs/uuid) | Identifier generation | MIT |
| [Electron](https://github.com/electron/electron) | Desktop runtime | MIT |

All of the above except Saxon-JS are permissive/GPL-compatible. Saxon-JS is
proprietary and is combined with this GPL program under the additional
permission granted in the NOTICE file.

--------------------------------------------------------------------------------

## Saxon-JS and xslt3 — Saxonica Limited

Redistributed in binary form as part of this application, as permitted by the
Saxonica license. The following copyright notice and disclaimer are reproduced
as required by that license:

```
      Version 1.0, June 2020
      
      Software: This license applies to the packages "xslt3" and "saxon-js"
      distributed via npm (https://www.npmjs.com) and to the modules SaxonJS2.js
      and SaxonJS2.rt.js available for download from the Saxonica web site
      (https://www.saxonica.com/).
      
      Copyright: The copyright in the Software belongs to Saxonica Ltd, except
      for third-party components listed in the documentation that are distributed
      under license.
      
      Binary form: In this license, "binary form" means the form in which the
      Software is issued (this is technically a set of obfuscated Javascript files).
      
      Deployment and use. The Software may be copied to any computer where the
      primary purpose is the execution of the software on that computer, or on
      connected client computers.
      
      Redistribution.  Redistribution in binary form, without
      modification, is permitted as part of an application that makes use
      of the Software, provided that the following conditions are
      met:
      
      1) Redistributions must reproduce the above copyright notice and the
      following disclaimer in the documentation and/or other materials
      provided with the distribution.
      
      2) Except to the extent explicitly permitted by law, no reverse
      engineering, decompilation, or disassembly of this software is
      permitted.
      
      3) Neither the name of the copyright holder nor the names of its
      contributors may be used to endorse or promote products derived from
      this software without specific prior written permission.
      
      4) Copying the software to a site whose primary purpose is to make
      it available to third parties is not permitted without specific
      prior written permission.
      
      If you institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the software
      itself infringes your patent(s), then your rights granted under this
      license shall terminate as of the date such litigation is filed.
      
      DISCLAIMER. THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND
      CONTRIBUTORS "AS IS." ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT
      NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
      FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
      HOLDERS OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
      SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
      TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
      PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
      LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
      NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
      SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

--------------------------------------------------------------------------------

## bpmn-js — Camunda Services GmbH (MIT, watermark clause)

```
Copyright (c) 2014-present Camunda Services GmbH

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in the
Software without restriction, including without limitation the rights to use, copy,
modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
and to permit persons to whom the Software is furnished to do so, subject to the
following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

The source code responsible for displaying the bpmn.io project watermark that
links back to https://bpmn.io as part of rendered diagrams MUST NOT be
removed or changed. When this software is being used in a website or application,
the watermark must stay fully visible and not visually overlapped by other elements.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
OR OTHER DEALINGS IN THE SOFTWARE.
```

**Compliance note:** the bpmn.io watermark rendered on BPMN diagrams is kept
fully visible in this application (`.bjs-powered-by` is forced visible in
`src/components/BPMNEditor/BPMNEditor.css`) and must remain so in any derivative.

--------------------------------------------------------------------------------

## MIT components (react, react-dom, uuid, jszip, Electron)

These are provided under the MIT License (jszip under "MIT OR GPL-3.0-or-later";
used here under MIT). Full texts ship in each package's `node_modules/<pkg>/`
directory. The standard MIT terms grant use, copy, modify, merge, publish,
distribute, sublicense, and sell, provided the copyright and permission notice
are retained.
