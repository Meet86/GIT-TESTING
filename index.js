import jsonfile from 'jsonfile';
import moment from 'moment';
import simpleGit from 'simple-git';

const path = 'data.json';
const dete = moment().subtract(150, 'days').format();

const data ={
    date: dete
};

jsonfile.writeFile(path, data, () => {
simpleGit().add([path]).commit(data.date,{'--date': data.date}).push();
  });


jsonfile.writeFile(path,data);

simpleGit().add([path]).commit(data.date,{'--date': data.date}).push();