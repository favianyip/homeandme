<%@ Page Title="" Language="C#" MasterPageFile="~/MasterPage.master" AutoEventWireup="true" CodeFile="AboutUs.aspx.cs" Inherits="AboutUs" %>

<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a"
    Namespace="DevExpress.Web" TagPrefix="dx" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <div class="hnm-about-new">
        <div style="background-image: url(../assets/images/about-us-bg.png);" class="hnm-about-new__bg"></div>
        <div class="content-wrapper">
            <div class="hnm-about-new__wrapper">
                <div class="hnm-about-new__sec1">
                    <h1 class="hnm-about-head">About <span class="hnm-about-head-sub hnm-about-head-sub--first">U</span><span class="hnm-about-head-sub hnm-about-head-sub--second">s</span></h1>
                </div>
                <div class="hnm-about-new__sec2">
                    <p class="hnm-about-body">
                        Home And Me Pte Ltd (HNM) is a Company founded in 2017 by a group of enthusiast 
                        entrepreneurs who faced excessive challengers when renovating their homes and offices. The 
                        founders feel that why the word HOME is spelt ending with Me is that they believe in 
                        completing every home with me.
                    </p>
                    <p class="hnm-about-body">
                        We realise that the current renovation process lacks transparency and having to pay high 
                        markup fees to the Interior Designing firms, they do not actually receive the services of an 
                        actual Interior Designer. (most of these ID firms so call Interior Designers are sale person 
                        or coordinators)
                    </p>
                    <p class="hnm-about-body">
                        HNM was set up with the goal to achieve major cost savings, transparent pricing for 
                        homeowners and complete control over their home renovation process.
                    </p>
                    <p class="hnm-about-body">
                        The founders strongly believe that home renovation is close to heart as well as an essential 
                        process to transform a house into a home. The portal also provides free templates and 
                        design concepts for their references as well as giving them the insights to the current 
                        renovation trends and home inspirations.
                    </p>
                    <p class="hnm-about-body">
                        Most of us will somehow encounter the renovation process more than once in our lifetime, 
                        however there is no platform that enables homeowners to take matters into their own hands. 
                        Therefore, within the HNM portal, the company tries their utmost best to provide 
                        infomation and knowledge to the homeowners regarding all renovation matters. In this 
                        instance, HNM can empower the homeowners indefinitely.
                    </p>
                       <p>   <a class="hnm-button"  href="Home.aspx">START YOUR RENOVATION NOW</a>
                 </p>
                
                </div>
            </div>
        </div>
    </div>
</asp:Content>

