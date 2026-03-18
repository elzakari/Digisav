import { generateGroupPrefix } from './src/utils/generators';

const testCases = [
    "Digital Savings Club",
    "Zakari Group",
    "Daro",
    "The High Performance Team",
    "AA",
    "A",
    "M-PESA Agents Group"
];

testCases.forEach(name => {
    console.log(`Name: "${name}" -> Prefix: "${generateGroupPrefix(name)}"`);
});
