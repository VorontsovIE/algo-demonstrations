import {d3, search_demo, shift_pattern_naive} from "./kmp.js";
const width = 1000;
const height = 100;
const svg = d3.select("svg")
    .attr("viewBox", [0, 0, width, height]);
// document.body.append(svg.node());

let text = 'mississippi';
let pattern = 'sip';

// document.getElementById('control').addEventListener('change', function(event){
//   search_demo
// })

search_demo(svg, text,pattern, shift_pattern_naive, {step_delay: 750, final_delay:4000});
