import{j as e}from"./jsx-runtime.D_zvdyIk.js";import{r as a}from"./index.CLbXGnnZ.js";import{c}from"./createLucideIcon.ChTKsr9-.js";/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const n=[["path",{d:"m12 15 2 2 4-4",key:"2c609p"}],["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]],p=c("copy-check",n);/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]],d=c("copy",y);function u({text:r}){const[t,o]=a.useState(!1),i=async()=>{try{await navigator.clipboard.writeText(r),o(!0),setTimeout(()=>o(!1),2e3)}catch(s){console.error("Failed to copy:",s)}};return e.jsx("button",{onClick:i,className:"p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-white",title:t?"Copied!":"Copy to clipboard",children:t?e.jsx(p,{size:18,className:"text-green-500"}):e.jsx(d,{size:18})})}export{u as default};
