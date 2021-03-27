import {d3, search_demo, pattern_shifts_naive, pattern_shifts_kmp, resettable_loop} from "./kmp.js";
const width = 1000;
const height = 150;
const svg = d3.select("svg")
    .attr("viewBox", [0, 0, width, height]);
// document.body.append(svg.node());

let form_bound_generator = function(form, generator_fn) {
  let form_naive_btn = form.getElementsByTagName('button')[0];

  let text = form.querySelector('input[name=main-text]').value;
  let pattern = form.querySelector('input[name=pattern-text]').value;

  let generator_fn_closure = () => generator_fn(text, pattern);
  let generator = resettable_loop(generator_fn_closure);

  form_naive_btn.addEventListener('click', function(event){
    event.preventDefault();
    let text = form.querySelector('input[name=main-text]').value;
    let pattern = form.querySelector('input[name=pattern-text]').value;
    var newurl = `${window.location.pathname}?pattern=${pattern}&text=${text}`;
    window.history.pushState({}, '', newurl);
    let generator_fn_closure = () => generator_fn(text, pattern);
    generator.next(generator_fn_closure);
  });

  return generator;
}

let url_string = window.location.href;
let url = new URL(url_string);
let text = url.searchParams.get('text') || 'mississippi';
let pattern = url.searchParams.get('pattern') || 'sip';

let form_naive = document.getElementById('form-naive');
form_naive.querySelector('input[name=main-text]').value = text;
form_naive.querySelector('input[name=pattern-text]').value = pattern;

let generator = form_bound_generator(form_naive, pattern_shifts_kmp);
search_demo(svg, generator, {step_delay: 750, match_delay: 2000, final_delay:4000, jump_delay: 4000});
