// Fixes for the Elementor atomic form ("Become a Partner" popup) that lose data on the original site too.
// No visual changes — they only make the submitted values correct.
(function () {
  function fixForms() {
    document.querySelectorAll("form.e-form-base").forEach(function (form) {
      // 1. Dropdown options were saved with value="" (Areas of Interest, Partnership Type), so the
      //    choice was always submitted empty. Use the option text as its value.
      form.querySelectorAll("select option").forEach(function (o) {
        if (o.value === "" && o.text.trim()) o.value = o.text.trim();
      });
      // 2. Labels whose "for" points at a non-existent id (e.g. Areas of Interest) — point them at
      //    the control that follows, so the submission gets the right field label.
      form.querySelectorAll("label.e-form-label-base[for]").forEach(function (l) {
        if (document.getElementById(l.htmlFor)) return;
        var next = l.nextElementSibling;
        if (next && /^(INPUT|SELECT|TEXTAREA)$/.test(next.tagName) && next.id) l.htmlFor = next.id;
      });
    });
  }

  // 3. Industries checkboxes: copy the ticked values into the hidden "industries-values" field.
  document.addEventListener("change", function (e) {
    var cb = e.target;
    if (!cb.matches || !cb.matches(".technoai-industry-option input[type=checkbox]")) return;
    var form = cb.closest("form");
    var target = form && form.querySelector('[name="industries-values"]');
    if (!target) return;
    target.value = Array.prototype.filter
      .call(form.querySelectorAll(".technoai-industry-option input[type=checkbox]"), function (c) { return c.checked; })
      .map(function (c) { return c.value; })
      .join(", ");
  });

  fixForms();
  document.addEventListener("DOMContentLoaded", fixForms);
  window.addEventListener("load", function () {
    if (window.jQuery) window.jQuery(document).on("elementor/popup/show", fixForms);
  });
})();
