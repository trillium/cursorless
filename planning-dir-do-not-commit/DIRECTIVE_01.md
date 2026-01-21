# Task

Combine overlapping shiki systems to coalesce into one single system around ScopeVisualizer

Assume that the code in ScopeVisualizer is always superior to the code in ShikiComponent

Goal is to get the rendering engine of scope visualizer to render the data passed from test-case-component

success is getting one interpretation of a test case component to render within the confines of the scope visualizer componnent

test-case-componet has a BEFORE state and an AFTER state that are predefined, an interim success metric would be to get BEFORE and AFTER to each render as their own code components

Another success metric is to have a wrapper component may called VisualizerWrapper that can render multiple states

eg BEFORE -> AFTER

another success metric is the ability to generate a unique DURING step from the code such that we know what ranges exist such as insertion range or selection range etc. We do not need to create a way of defining these, they should be already accessible within the .yml test cases

## User stories

As a system, I want to be able to have DRY components, allowing the developers to depend on components that build off eachother. I do NOT NEED two separate systems for visualizing a Shiki code block, and the systems should be merged into ONE system where aditional functionality ectends off the other.

(this is the most important - one DRY system that uses the backbone of ScopeVisualizer)
