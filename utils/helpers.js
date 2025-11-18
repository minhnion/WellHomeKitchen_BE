const createSlug = (title) => {
  const vietnamese = {
    "à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ": "a",
    "è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ": "e",
    "ì|í|ị|ỉ|ĩ": "i",
    "ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ": "o",
    "ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ": "u",
    "ỳ|ý|ỵ|ỷ|ỹ": "y",
    đ: "d",
    "À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ": "A",
    "È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ": "E",
    "Ì|Í|Ị|Ỉ|Ĩ": "I",
    "Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ": "O",
    "Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ": "U",
    "Ỳ|Ý|Ỵ|Ỷ|Ỹ": "Y",
    Đ: "D",
  };

  let str = title;
  for (let key in vietnamese) {
    str = str.replace(new RegExp(key, "g"), vietnamese[key]);
  }

  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

const deletedName = (name) => {
  name = name + " deleted " + Date.now().toString();
  return name;
};

const generateOrderCode = () => {
  const mapMonth = {
    1: "A",
    2: "B",
    3: "C",
    4: "D",
    5: "E",
    6: "F",
    7: "G",
    8: "H",
    9: "I",
    10: "J",
    11: "K",
    12: "L",
  };
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = mapMonth[date.getMonth() + 1];
  const day = date.getDate().toString().padStart(2, "0");
  const randomNum = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");

  return month + year + day + randomNum;
};

export { createSlug, deletedName, generateOrderCode };
