import { createContext, useContext, useReducer, ReactNode, Dispatch } from "react";
import { managmentGym } from "../reducer/managmentReducer";
import { Managment, ManagmentAction } from "../types/types";

interface Props {
  children: ReactNode
}
const initialState: Managment = {
  machine: []
}

export const GlobalContext = createContext<[Managment, Dispatch<ManagmentAction>]>([initialState, () => { }])
// export const Attendance = createContext<Student>({studentData: {}})

export const useGlobalContext = () => useContext(GlobalContext)[0]
export const useGlobalContextDispatch = () => useContext(GlobalContext)[1]

export const GlobalContextProvider = ({ children }: Props) => {

  return (
    <GlobalContext.Provider value={useReducer(managmentGym, initialState)}>
      {children}
    </GlobalContext.Provider>
  )
}