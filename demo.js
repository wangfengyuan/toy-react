
const fs = require('fs');
const PCA = require('area-data').pca;
const PCAA = require('area-data').pcaa;

const provinces = PCA['86'] // 等同于 AreaData['86']
const obj = {}
const names = []
const newArrs = []
for (let provinceCode in provinces) {
    const name = provinces[provinceCode];
    names.push(name);
    const citys = PCAA[provinceCode];
    const temp = {}
    for (let city in citys) {
        if (JSON.stringify(city) !== '{}' && typeof PCAA[city] !== 'undefined') {
            const cityName = citys[city]
            const newArr = Object.values(PCAA[city]).filter((item) => {
                return !/[街道|镇]/.test(item)
            })
            console.log('PCAA[city]', newArr);
            temp[cityName] = newArr;
            newArrs.push(temp);
        }
    }
    obj[name] = temp;
}
fs.writeFileSync('./name.json', JSON.stringify(names));
fs.writeFileSync('./newArr.json', JSON.stringify(newArrs));
fs.writeFileSync('./result.json', JSON.stringify(obj));