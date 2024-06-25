import React from 'react';
import classNames from 'classnames/bind'
import styles from './TableDevices.module.scss'
const cx = classNames.bind(styles);

interface NetworkInterfaceType {
  name: string;
  address: string;
  netmask: string;
  mac: string;
  cidr: string;
  nat_ip: string;
  port: number;
}
interface TableDevicesParams {
  interfacesWithInternet: NetworkInterfaceType[]
}
export default function TableDevices({interfacesWithInternet} : TableDevicesParams) {
  const gridValue = "40px 1fr 1fr 1fr 100px 100px 100px 130px"
  return (
    <div className={cx('wrap-table')}>
        <div className={cx('table-devices')}>
          <div className={cx('table-header')} style={{gridTemplateColumns: gridValue}}>
            <div className={cx('')}>No</div>
            <div>Name</div>
            <div>IPv4</div>
            <div>Nat IP</div>
            <div>Proxy Port</div>
            <div>Status</div>
            <div>Reset</div>
            <div>Change Name</div>
          </div>
          <div className={cx('table-body')}>
            {interfacesWithInternet.map((iface: NetworkInterfaceType, i: number) =>{
              return (
                <div className={cx('table-row')} key={i} style={{gridTemplateColumns: gridValue}}>
                  <div>{i + 1}</div>
                  <div>{iface.name}</div>
                  <div>{iface.address}</div>
                  <div>{iface.nat_ip}</div>
                  <div>{iface.port}</div>
                  <div style={{color: "green"}}>Running</div>
                  <div>
                    <button className={cx('btn-decor')}>Reset</button>
                  </div>
                  <div>
                    <button className={cx('btn-decor')}>Chang Name</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>     
    </div>
  )
}

export {NetworkInterfaceType}