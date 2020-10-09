/* eslint-disable */
import React, { useState, useEffect, createContext } from 'react';
import { useTranslation } from 'react-i18next';
import BigNumber from "bignumber.js";
import {byDecimals, calculateReallyNum} from 'features/helpers/bignumber';
// @material-ui/core components
import { makeStyles } from "@material-ui/core/styles";
import classNames from "classnames";

import { isEmpty } from 'features/helpers/utils';
import Accordion from '@material-ui/core/Accordion'
import AccordionSummary from '@material-ui/core/AccordionSummary'
import AccordionDetails from '@material-ui/core/AccordionActions'
import Typography from '@material-ui/core/Typography';
import FormControl from '@material-ui/core/FormControl';
import CustomOutlinedInput from 'components/CustomOutlinedInput/CustomOutlinedInput';
import Grid from '@material-ui/core/Grid';
import Hidden from '@material-ui/core/Hidden';
// core components
import Button from "components/CustomButtons/Button.js";
import Avatar from '@material-ui/core/Avatar';
import AvatarGroup from '@material-ui/lab/AvatarGroup';
import CustomSlider from 'components/CustomSlider/CustomSlider';
import CustomDropdown from "components/CustomDropdown/CustomDropdown.js";
//  hooks
import { useConnectWallet } from '../../home/redux/hooks';
import { useFetchBalance, useFetchBalances, useFetchPoolsInfo, useCheckApproval, useFetchApproval, useFetchDeposit, useFetchWithdraw } from '../redux/hooks';
import sectionPoolsStyle from "../jss/sections/sectionPoolsStyle";
import { inputLimitPass,inputFinalVal } from 'features/helpers/utils';

const useStyles = makeStyles(sectionPoolsStyle);
const ethTokenDecimals = 18;

export default function SectionPoolsCard(props) {
  const {
    pool,
    poolIndex,
    openCard,
    cardIsOpenedList,
  } = props;

  const { t, i18n } = useTranslation();
  const classes = useStyles();
  const { web3, address, networkId } = useConnectWallet();
  const { checkApproval } = useCheckApproval();
  const { fetchApproval } = useFetchApproval();
  const { fetchDeposit } = useFetchDeposit();
  const { fetchWithdraw } = useFetchWithdraw();
  const { etherBalance, fetchBalance } = useFetchBalance();
  const { erc20Tokens, fetchBalances } = useFetchBalances();
  const { poolsInfo, fetchPoolsInfo } = useFetchPoolsInfo();

  const [ tokenIndex, setTokenIndex ] = useState(0);
  const [ isNeedApproval, setIsNeedApproval ] = useState(true);// 是否需要授权
  const [ approvalAble, setApprovalAble ] = useState(false);// 授权按钮是否可点击
  const [ depositAble, setDepositAble ] = useState(true);// 存入按钮是否可点击
  const [ withdrawAble, setWithdrawAble ] = useState(true);// 提取按钮是否可点击

  //选择币种的下啦列表
  const [ cardFirstDropdownList, setCardFirstDropdownList ] = useState([]);
  //选择的币种信息
  const [ selectedTokenInfo, setSelectedTokenInfo ] = useState({name:'',depositeMax:BigNumber(0),withdrawMax:BigNumber(0)});
  //存入信息
  const [ depositedBalance, setDepositedBalance ] = useState({});
  //提取信息
  const [ withdrawAmount, setWithdrawAmount ] = useState({});

  useEffect(() => {
    let tokenName = pool.canDepositTokenList[tokenIndex];
    let depositeMax = BigNumber(0);
    if(tokenName == 'eth'){
      depositeMax = byDecimals(etherBalance,getTockenDecimals(tokenName));
    }else{
      depositeMax = byDecimals(erc20Tokens[tokenName].tokenBalance,getTockenDecimals(tokenName));
    }
    let withdrawMax = byDecimals(erc20Tokens[pool.earnedToken].tokenBalance,getTockenDecimals(pool.earnedToken));
    setSelectedTokenInfo({
      name:tokenName,
      depositeMax,
      withdrawMax,
    })
  }, [cardFirstDropdownList, tokenIndex, erc20Tokens]);

  useEffect(() => {
    setCardFirstDropdownList(createCardFirstDropdownList(pool.canDepositTokenList));
  }, [pool.canDepositTokenList]);

  useEffect(() => {
    setIsNeedApproval(Boolean(pool.canDepositTokenAllowanceList[tokenIndex].toNumber() === 0));
  }, [poolIndex, tokenIndex]);

  useEffect(() => {
    setApprovalAble(!Boolean(pool.fetchApprovalPending[tokenIndex]));
  }, [poolIndex, tokenIndex, pool.fetchApprovalPending[tokenIndex]]);

  const onApproval = (event) => {
    event.stopPropagation();
    fetchApproval(poolIndex, tokenIndex)
  }

  const getTockenDecimals = (tockenName) => {
    return tockenName == 'eth' ? ethTokenDecimals : erc20Tokens[tockenName].tokenDecimals;
  }

  const changeDetailInputValue = (type,index,event) => {
    let value = event.target.value;
    let total = type=='depositedBalance' ? selectedTokenInfo.depositeMax.toNumber() : selectedTokenInfo.withdrawMax.toNumber();
    if(!inputLimitPass(value,getTockenDecimals(selectedTokenInfo.name))){
      return;
    }
    let sliderNum = 0;
    let inputVal = Number(value.replace(',',''));
    if(!isEmpty(value)){
      sliderNum = BigNumber(inputVal/total).toFixed(2) * 100;
    }
    switch(type){
      case 'depositedBalance':
        setDepositedBalance({
          ...depositedBalance,
          [index]: inputFinalVal(value,total),
          [`slider-${index}`]: sliderNum,
        });
        break;
      case 'withdrawAmount':
        setWithdrawAmount({
          ...withdrawAmount,
          [index]: inputFinalVal(value,total),
          [`slider-${index}`]: sliderNum,
        });
        break;
      default:
        break;
    }
  }

  const handleDepositedBalance = (index,event,sliderNum) => {
    let total = selectedTokenInfo.depositeMax.toNumber();
    setDepositedBalance({
      ...depositedBalance,
      [index]: sliderNum == 0 ? 0: calculateReallyNum(total,sliderNum),
      [`slider-${index}`]: sliderNum == 0 ? 0: sliderNum,
    });
  }

  const handleWithdrawAmount = (index,event,sliderNum) => {
    let total = selectedTokenInfo.withdrawMax.toNumber();
    setWithdrawAmount({
      ...withdrawAmount,
      [index]: sliderNum == 0 ? 0: calculateReallyNum(total,sliderNum),
      [`slider-${index}`]: sliderNum == 0 ? 0: sliderNum,
    });
  };

  useEffect(() => {
    setDepositAble(!Boolean(pool.fetchDepositPending[tokenIndex]) && (!isEmpty(depositedBalance[poolIndex])&&depositedBalance[poolIndex]!=0));
  }, [poolIndex, tokenIndex, pool.fetchDepositPending[tokenIndex], depositedBalance[poolIndex]]);
  
  // 存入
  const onDeposit = (isAll, event) => {
    event.stopPropagation();
    if (isAll) {
      setDepositedBalance({
        ...depositedBalance,
        [poolIndex]: selectedTokenInfo.depositeMax.toNumber(),
        [`slider-${poolIndex}`]: 100,
      })
    }
    let amount = new BigNumber(depositedBalance[poolIndex]).multipliedBy(new BigNumber(10).exponentiatedBy(getTockenDecimals(selectedTokenInfo.name))).toString(10)
    fetchDeposit(amount, poolIndex, tokenIndex, isAll)
  }

  useEffect(() => {
    setWithdrawAble(!Boolean(pool.fetchWithdrawPending[tokenIndex]) && (!isEmpty(withdrawAmount[poolIndex])&&withdrawAmount[poolIndex]!=0));
  }, [poolIndex, tokenIndex, pool.fetchWithdrawPending[tokenIndex], withdrawAmount[poolIndex]]);

  // 提取
  const onWithdraw = (isAll, event) => {
    event.stopPropagation();
    if (isAll) {
      setWithdrawAmount({
        ...withdrawAmount,
        [poolIndex]: selectedTokenInfo.withdrawMax.toNumber(),
        [`slider-${poolIndex}`]: 100,
      })
    }
    let amount = new BigNumber(withdrawAmount[poolIndex]).multipliedBy(new BigNumber(10).exponentiatedBy(getTockenDecimals(selectedTokenInfo.name))).toString(10)
    fetchWithdraw(amount, poolIndex, tokenIndex, isAll)
  }

  const createCardFirstDropdownList = (canDepositTokenList) => {
    let cardFirstDropdownList = [];
    canDepositTokenList.map((id,index)=>{
      if(id == 'eth'){
        cardFirstDropdownList.push(singleCardFirstDropDownNode({tockeDescriptionUrl:'ETH'},index));
      }else{
        if (!isEmpty(erc20Tokens[id])){
          cardFirstDropdownList.push(singleCardFirstDropDownNode(erc20Tokens[id],index));
        }
      }
    })
    return cardFirstDropdownList;
  }

  const singleCardFirstDropDownNode = (item,index) => {
    return (
      <div className={classes.subMemuStyle} key={index}>
          {
            item.tockeDescriptionUrl == 'LP' ? (
              <AvatarGroup 
                max={4}
                className={classNames({
                    [classes.marginRight]:true,
                    [classes.avatar]:true,
                })}
              >
                {
                  pool.tokenLogoList.map((tokenVal)=>(
                    <Avatar src={require(`../../../images/${tokenVal}-logo.png`)} />
                  ))
                }
                </AvatarGroup>
            ): (
              <Avatar 
                alt={item.tockeDescriptionUrl}
                src={require(`../../../images/${item.tockeDescriptionUrl}-logo.png`)}
                className={classNames({
                    [classes.marginRight]:true,
                    [classes.avatar]:true,
                })}
                />
            )
          }
          <span className={classes.avatarFont}>{item.tockeDescriptionUrl}</span>
      </div>
    )
  }

  const handleCardFirstDropdownListClick = (event) => {
    setTokenIndex(Number(event.key));
    setDepositedBalance({
      [poolIndex]: 0,
      [`slider-${poolIndex}`]: 0,
    })
    setWithdrawAmount({
      [poolIndex]: 0,
      [`slider-${poolIndex}`]: 0,
    })
  }

  useEffect(() => {
    if (address && web3) {
      checkApproval(poolIndex, tokenIndex)
    //   fetchPoolBalances({address, web3, pools});
    //   const id = setInterval(() => {
    //     fetchBalances({address, web3, tokens});
    //     fetchPoolBalances({address, web3, pools});
    //   }, 10000);
    //   return () => clearInterval(id);
    }
  }, [address, web3]);
  
  return (
    <Grid item xs={12} container key={poolIndex} style={{marginBottom: "24px"}} spacing={0}>
      <div style={{width: "100%"}}>
        <Accordion
          expanded={Boolean(cardIsOpenedList.includes(poolIndex))}
          className={classes.accordion}
          TransitionProps={{ unmountOnExit: true }}
          >
          <AccordionSummary
            className={classes.details}
            style={{ justifyContent: "space-between"}}
            onClick={(event) => {
              event.stopPropagation();
              openCard(poolIndex)
            }}>
            <Grid container alignItems="center" justify="space-around" spacing={4} style={{paddingTop: "16px", paddingBottom: "16px"}}>
              <Grid item>
                <Grid container alignItems="center" spacing={2}>
                  <Grid item>
                    <AvatarGroup max={4}>
                      {
                        pool.tokenLogoList.map((tokenVal)=>(
                          <Avatar src={require(`../../../images/${tokenVal}-logo.png`)} />
                        ))
                      }
                    </AvatarGroup>
                  </Grid>
                  <Grid item style={{minWidth: '100px'}}>
                    <Typography className={classes.iconContainerMainTitle} variant="body2" gutterBottom>{pool.token}</Typography>
                    <Typography className={classes.iconContainerSubTitle} variant="body2">{pool.token}</Typography>
                  </Grid>
                </Grid>
              </Grid>
              <Grid item md={8} xs={3}>
                <Grid item container justify="space-between">
                  <Hidden smDown>
                    <Grid item xs={7} container justify='center' alignItems="center">
                      <Grid item style={{width: "200px"}}>
                        <Typography className={classes.iconContainerMainTitle} variant="body2" gutterBottom noWrap>
                          {byDecimals(erc20Tokens[pool.earnedToken].tokenBalance,getTockenDecimals(pool.earnedToken)).toFixed(4,1)} {pool.earnedToken}
                        </Typography>
                        <Typography className={classes.iconContainerSubTitle} variant="body2">{t('Vault-Balance')}</Typography>
                      </Grid>
                    </Grid>
                  </Hidden>
                  <Hidden mdDown>
                    <Grid item xs={4} container justify='center' alignItems="center">
                      <Grid item style={{width: "200px"}}>
                        <Typography className={classes.iconContainerMainTitle} variant="body2" gutterBottom noWrap></Typography>
                        <Typography className={classes.iconContainerSubTitle} variant="body2">{t('Vault-Deposited')}</Typography>
                      </Grid>
                    </Grid>
                  </Hidden>
                  <Grid item xs={12} md={1} container justify='center' alignItems="center">
                    <Grid item>
                      <Typography className={classes.iconContainerMainTitle} variant="body2" gutterBottom noWrap></Typography>
                      <Typography className={classes.iconContainerSubTitle} variant="body2">{t('Vault-ListAPY')}</Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </AccordionSummary>
          <AccordionDetails style={{ justifyContent: "space-between"}}>
            <Grid container style={{width: "100%", marginLeft: 0, marginRight: 0}}>
              <Grid item xs={12} sm={4} className={classes.sliderDetailContainer}>
                <div className={classes.showDetailRight} style={{float: 'left',opacity: '1'}}>
                  选择币种
                </div>
                <FormControl fullWidth variant="outlined">
                  <CustomDropdown
                    popperClassName={classes.papperNav}
                    navDropdown
                    hoverColor='primary'
                    darkModal
                    buttonText={
                      cardFirstDropdownList[tokenIndex]
                    }
                    buttonProps={{
                        className: classes.receiveStyle,
                    }}
                    onClick={handleCardFirstDropdownListClick}
                    dropdownList={cardFirstDropdownList}
                    />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4} className={classes.sliderDetailContainer}>
                <div className={classes.showDetailRight}>
                  {t('Vault-Balance')}:{selectedTokenInfo.depositeMax.toFixed(4,1)} {selectedTokenInfo.name}
                </div>
                <FormControl fullWidth variant="outlined">
                  <CustomOutlinedInput 
                    value={depositedBalance[poolIndex]!=undefined ? depositedBalance[poolIndex] :'0'}
                    onChange={changeDetailInputValue.bind(this,'depositedBalance',poolIndex)}
                    />
                </FormControl>
                <CustomSlider 
                  classes={{
                    root: classes.depositedBalanceSliderRoot,
                    markLabel: classes.depositedBalanceSliderMarkLabel,
                  }}
                  aria-labelledby="continuous-slider" 
                  value={depositedBalance['slider-'+poolIndex]?depositedBalance['slider-'+poolIndex]:0}
                  onChange={handleDepositedBalance.bind(this,poolIndex)}
                />
                <div>
                  {
                    isNeedApproval ? (
                      <div className={classes.showDetailButtonCon}>
                        <Button 
                          style={{
                            width: '180px',
                            margin: '12px 5px',
                            fontSize: '14px',
                            fontWeight:'bold',
                            backgroundColor:'#353848',
                            color:'#FF2D82',
                            boxShadow:'0 2px 2px 0 rgba(53, 56, 72, 0.14), 0 3px 1px -2px rgba(53, 56, 72, 0.2), 0 1px 5px 0 rgba(53, 56, 72, 0.12)'
                          }}
                          round
                          color="primary"
                          onClick={onApproval.bind(this)}
                          disabled={!approvalAble}
                          >
                          {pool.fetchApprovalPending[tokenIndex] ? `${t('Vault-ApproveING')}` : `${t('Vault-ApproveButton')}`}
                        </Button>
                      </div>
                    ) : (
                      <div className={classes.showDetailButtonCon}>
                        <Button 
                          style={{
                            width: '180px',
                            margin: '12px 5px',
                            fontSize: '14px',
                            fontWeight:'bold',
                            backgroundColor:'#353848',
                            color:'#FF2D82',
                            boxShadow:'0 2px 2px 0 rgba(53, 56, 72, 0.14), 0 3px 1px -2px rgba(53, 56, 72, 0.2), 0 1px 5px 0 rgba(53, 56, 72, 0.12)'
                          }}
                          round
                          onFocus={(event) => event.stopPropagation()}
                          disabled={!depositAble}
                          onClick={onDeposit.bind(this,false)}
                          >{t('Vault-DepositButton')}
                        </Button>
                        {
                          selectedTokenInfo.name!='eth' && <Button 
                            style={{
                                width: '180px',
                                margin: '12px 5px',
                                fontSize: '14px',
                                fontWeight:'bold',
                                backgroundColor:'#353848',
                                color:'#FF2D82',
                                boxShadow:'0 2px 2px 0 rgba(53, 56, 72, 0.14), 0 3px 1px -2px rgba(53, 56, 72, 0.2), 0 1px 5px 0 rgba(53, 56, 72, 0.12)'
                            }}
                            round
                            onFocus={(event) => event.stopPropagation()}
                            disabled={!depositAble}
                            onClick={onDeposit.bind(this, true)}
                            >{t('Vault-DepositButtonAll')}
                          </Button>
                        }
                      </div>
                    )
                  }
                </div>
              </Grid>
              <Grid item xs={12} sm={4} className={classes.sliderDetailContainer}>
                <div className={classes.showDetailRight}>
                  {selectedTokenInfo.withdrawMax.toFixed(4,1)} {pool.earnedToken}
                </div>
                <FormControl fullWidth variant="outlined">
                  <CustomOutlinedInput 
                    value={withdrawAmount[poolIndex]!=undefined ? withdrawAmount[poolIndex] : '0'}
                    onChange={changeDetailInputValue.bind(this,'withdrawAmount',poolIndex)}
                    />
                </FormControl>
                <CustomSlider 
                  classes={{
                      root: classes.drawSliderRoot,
                      markLabel: classes.drawSliderMarkLabel,
                  }}
                  aria-labelledby="continuous-slider" 
                  value={withdrawAmount['slider-'+poolIndex]?withdrawAmount['slider-'+poolIndex]:0}
                  onChange={handleWithdrawAmount.bind(this,poolIndex)}
                  />
                <div className={classes.showDetailButtonCon}>
                  <Button 
                    style={{
                      width: '180px',
                      margin: '12px 5px',
                      fontSize: '14px',
                      fontWeight:'bold',
                      backgroundColor:'#353848',
                      color:'#635AFF',
                      boxShadow:'0 2px 2px 0 rgba(53, 56, 72, 0.14), 0 3px 1px -2px rgba(53, 56, 72, 0.2), 0 1px 5px 0 rgba(53, 56, 72, 0.12)'
                    }}
                    round
                    type="button"
                    color="primary"
                    disabled={!withdrawAble}
                    onClick={onWithdraw.bind(this, false)}
                    >
                    {pool.fetchWithdrawPending[tokenIndex] ? `${t('Vault-WithdrawING')}`: `${t('Vault-WithdrawButton')}`}
                  </Button>
                  <Button 
                    style={{
                      width: '180px',
                      margin: '12px 5px',
                      fontSize: '14px',
                      fontWeight:'bold',
                      backgroundColor:'#353848',
                      color:'#635AFF',
                      boxShadow:'0 2px 2px 0 rgba(53, 56, 72, 0.14), 0 3px 1px -2px rgba(53, 56, 72, 0.2), 0 1px 5px 0 rgba(53, 56, 72, 0.12)',
                    }}
                    round
                    type="button"
                    color="primary"
                    disabled={!withdrawAble}
                    onClick={onWithdraw.bind(this, true)}
                    >
                    {pool.fetchWithdrawPending[tokenIndex] ? `${t('Vault-WithdrawING')}`: `${t('Vault-WithdrawButtonAll')}`}
                  </Button>
                </div>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </div>
    </Grid>
  )
}