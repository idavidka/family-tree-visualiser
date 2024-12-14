/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const shuffle = require("lodash/shuffle");

const getRandomColor = () => {   
    return "hsl(" + 360 * Math.random() + ',' + 
        (40 + 70 * Math.random()) + '%,' + 
        (30 + 55 * Math.random()) + '%)'
};
  
const generateRandomColors = (amunt) => {
    const colors = [];
    for( let i = 0; i < amunt; i++ ){
        const color = getRandomColor();

        if(!colors.includes(color)) {
            colors.push(color);
        } else {
            i--;
        }
    }

    return shuffle(colors);
};

const colors = generateRandomColors(20000);

fs.writeFileSync('./src/constants/colors.json', JSON.stringify(colors), { 
    flag: 'w'
});