import {http} from '@/api/http'

export function splitList(data){
   return http({
        url : '/medical/image/split/list',
        method : 'POST',
        data : data,
    })
}

export function uploadAPI(data){
    return http({
         url : '/medical/image/upload',
         method : 'POST',
         data : data,
     })
 }

//使用
//  import { LoginAPI, LoginAPI } from "@/Api";
//  LoginAPI()