/**
 * Copyright (c) 2023~2023, KIRAKIRA Project Team.
 */

(function (markdownit) {
    'use strict';

    const md = new markdownit();
    const mdEdit = document.getElementById("md-edit");
    const htmlPreview = document.getElementById("html-preview");
    const resultPreview = document.getElementById("result-preview");
    mdEdit.addEventListener("input", function () {
        const text = this.value;
        const result = md.render(text);
        htmlPreview.innerText = result;
        resultPreview.innerHTML = result;
    });

})(markdownit);
